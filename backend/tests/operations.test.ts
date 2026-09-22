import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers.js';
import { DEMO_PERSON } from '../src/demo.js';
import { enrollmentSchema, Operations, requiredRoutingChecks } from '../src/operations.js';

describe('assisted enrollment and restoration gates', () => {
  let f: Awaited<ReturnType<typeof fixture>>; let ops: Operations;
  beforeAll(async () => { f = await fixture(); ops = new Operations(f.store); });
  beforeEach(async () => {
    await f.reset();
    await f.store.db.query("UPDATE participants SET status='setup',restored_at=NULL,deletion_requested_at=NULL,routing_test_until=NULL WHERE id=$1", [DEMO_PERSON]);
  });
  afterAll(async () => { await f.app.close(); });
  const testInput = () => ({ participantId: DEMO_PERSON, testedAt: new Date().toISOString(), evidenceReference: 'synthetic-test-fixture-only', checks: Object.fromEntries(requiredRoutingChecks.map(check => [check, true])) });

  it('accepts Firebase UIDs and legacy UUIDs while bounding the opaque identity', () => {
    const input = { name: 'Fixture', phone: '+15125550191', shieldNumber: '+15125550192',
      carrierProfileId: 'test-profile', phoneOwnershipEvidence: 'fixture-verified-device' };
    for (const authSubject of ['FirebaseUser_28charactersTest', randomUUID()]) {
      expect(enrollmentSchema.parse({ ...input, authSubject }).authSubject).toBe(authSubject);
    }
    expect(() => enrollmentSchema.parse({ ...input, authSubject: '' })).toThrow();
    expect(() => enrollmentSchema.parse({ ...input, authSubject: 'x'.repeat(129) })).toThrow();
  });

  it('rejects incomplete, stale, or future test evidence', async () => {
    await expect(ops.recordRoutingTest({ ...testInput(), checks: {} })).rejects.toThrow();
    await expect(ops.recordRoutingTest({ ...testInput(), testedAt: '2000-01-01T00:00:00.000Z' })).rejects.toThrow();
    await expect(ops.recordRoutingTest({ ...testInput(), testedAt: '2100-01-01T00:00:00.000Z' })).rejects.toThrow();
  });
  it('requires participant consent before activation', async () => {
    await f.store.db.query('UPDATE participants SET consent_version=NULL WHERE id=$1', [DEMO_PERSON]);
    await expect(ops.activate(DEMO_PERSON)).rejects.toThrow();
    await f.app.inject({ method: 'POST', url: '/api/setup/consent', headers: f.auth(), payload: { version: 'shield-pilot-2026-09-v1', accepted: true } });
    await ops.recordRoutingTest(testInput()); await ops.activate(DEMO_PERSON);
    expect((await f.store.participant(DEMO_PERSON))?.status).toBe('active');
  });
  it('does not reassign an unowned DID', async () => {
    const p = await f.store.participant(DEMO_PERSON);
    await expect(ops.enroll({ authSubject: randomUUID(), name: 'Fixture', phone: '+15125550191', shieldNumber: '+15125550192',
      carrierProfileId: p?.carrier_profile_id, phoneOwnershipEvidence: 'fixture-verified-device' }, async () => { throw new Error('not_owned'); })).rejects.toThrow('not_owned');
    expect((await f.store.db.query('SELECT id FROM participants WHERE did=$1', ['+15125550192'])).rows).toHaveLength(0);
  });
  it('global pause prevents call offers without dropping incoming voicemail', async () => {
    await f.store.db.query("UPDATE participants SET status='active' WHERE id=$1", [DEMO_PERSON]);
    await ops.pauseAll(true);
    const call = await f.begin(); expect(call.response.body).toContain('<Record'); expect(call.response.body).not.toContain('<Dial');
  });
  it('allows a bounded supervised test before activation and expires it automatically', async () => {
    await f.store.db.query('UPDATE participants SET last_routing_test_at=NULL WHERE id=$1', [DEMO_PERSON]);
    await ops.beginSupervisedTest({ participantId: DEMO_PERSON, operatorPresent: true, participantPresent: true });
    expect((await f.begin()).response.body).toContain('<Gather');
    await ops.endSupervisedTest(DEMO_PERSON);
    expect((await f.begin()).response.body).toContain('<Record');
    await expect(ops.activate(DEMO_PERSON)).rejects.toThrow();
    await ops.beginSupervisedTest({ participantId: DEMO_PERSON, operatorPresent: true, participantPresent: true });
    await f.store.db.query("UPDATE participants SET routing_test_until=now()-interval '1 minute' WHERE id=$1", [DEMO_PERSON]);
    expect((await f.begin()).response.body).toContain('<Record');
  });
  it('does not confirm restoration before it was requested', async () => {
    await expect(ops.confirmRestoration({ participantId: DEMO_PERSON, evidenceReference: 'fixture-restoration-test', forwardingDisabled: true,
      ordinaryCallsVerified: true, carrierVoicemailVerified: true })).rejects.toThrow();
  });
  it('requires restoration before purging and retains an offboarded DID tombstone', async () => {
    await expect(ops.purgeRequestedAccount(DEMO_PERSON)).rejects.toThrow();
    await f.app.inject({ method: 'POST', url: '/api/account/delete', headers: f.auth() });
    await ops.confirmRestoration({ participantId: DEMO_PERSON, evidenceReference: 'fixture-restoration-test', forwardingDisabled: true,
      ordinaryCallsVerified: true, carrierVoicemailVerified: true });
    await ops.purgeRequestedAccount(DEMO_PERSON);
    const p = (await f.store.participant(DEMO_PERSON))!;
    expect(p.status).toBe('offboarded'); expect(p.did).toBe('+15125550110'); expect(f.store.name(p)).toBe(''); expect(f.store.phone(p)).toBe('');
    expect((await f.app.inject({ url: '/api/people', headers: f.auth() })).json().people).toHaveLength(0);
  });
});
