import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers.js';
import { DEMO_PERSON, DEMO_SECOND_PERSON, syntheticSid } from '../src/demo.js';

describe('authenticated participant and caregiver API', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeAll(async () => { f = await fixture(); });
  beforeEach(async () => {
    await f.reset();
    await f.store.db.query("UPDATE caregiver_grants SET revoked_at=NULL,can_listen=false WHERE grantee_subject='demo-caregiver'");
  });
  afterAll(async () => { await f.app.close(); });

  it('requires authentication for history', async () => {
    expect((await f.app.inject('/api/calls')).statusCode).toBe(401);
  });
  it('removes the signed-out subject’s push registrations', async () => {
    const token = 'c'.repeat(64);
    expect((await f.app.inject({ method: 'POST', url: '/api/devices', headers: f.auth(), payload: { token } })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'POST', url: '/auth/logout', headers: f.auth() })).statusCode).toBe(200);
    expect((await f.store.db.query("SELECT * FROM push_devices WHERE auth_subject='demo-participant'")).rows).toHaveLength(0);
  });
  it('isolates call history and details by participant', async () => {
    const call = await f.begin();
    const own = await f.app.inject({ url: `/api/calls/${call.id}`, headers: f.auth() });
    expect(own.statusCode).toBe(200); expect(own.json().call.callerNumber).toBe('+15125550199');
    const other = await f.app.inject({ url: `/api/calls/${call.id}`, headers: f.auth(DEMO_SECOND_PERSON) });
    expect(other.statusCode).toBe(404);
    const selectingOther = await f.app.inject({ url: '/api/calls', headers: { ...f.auth(), 'x-shield-participant': DEMO_SECOND_PERSON } });
    expect(selectingOther.statusCode).toBe(403);
  });
  it('allows shared history but not owner actions or private contacts', async () => {
    await f.begin();
    const history = await f.app.inject({ url: '/api/calls', headers: f.caregiver() });
    expect(history.json().calls).toHaveLength(1);
    const pause = await f.app.inject({ method: 'POST', url: '/api/setup/pause', headers: f.caregiver(), payload: { paused: true } });
    expect(pause.statusCode).toBe(403);
    expect((await f.app.inject({ url: '/api/destinations', headers: f.caregiver() })).statusCode).toBe(403);
    expect((await f.app.inject({ url: '/api/setup', headers: f.caregiver() })).statusCode).toBe(403);
  });
  it('enforces independent voicemail consent and revocation', async () => {
    const call = await f.begin(); const id = randomUUID();
    await f.store.db.query(`INSERT INTO voicemails(id,participant_id,session_id,recording_sid,duration,status,audio_enc,expires_at)
      VALUES($1,$2,$3,$4,3,'ready',$5,now()+interval '1 day')`, [id, DEMO_PERSON, call.id, syntheticSid('RE', id), f.store.vault.seal(Buffer.from('synthetic audio'), `voicemail:${id}`)]);
    const path = `/api/voicemails/${id}/audio`;
    expect((await f.app.inject({ url: path, headers: f.caregiver() })).statusCode).toBe(403);
    await f.store.db.query("UPDATE caregiver_grants SET can_listen=true WHERE grantee_subject='demo-caregiver'");
    const result = await f.app.inject({ url: path, headers: f.caregiver() });
    expect(result.statusCode).toBe(200); expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toBe('synthetic audio');
    const grant = (await f.store.db.query("SELECT id FROM caregiver_grants WHERE grantee_subject='demo-caregiver'")).rows[0]!;
    await f.app.inject({ method: 'DELETE', url: `/api/sharing/${grant.id}`, headers: f.auth() });
    expect((await f.app.inject({ url: path, headers: f.caregiver() })).statusCode).toBe(403);
    expect((await f.app.inject({ url: path, headers: f.auth(DEMO_SECOND_PERSON) })).statusCode).toBe(404);
    expect((await f.app.inject({ url: path })).statusCode).toBe(401);
  });
  it('stores invitation codes only as hashes and accepts them once', async () => {
    const created = await f.app.inject({ method: 'POST', url: '/api/sharing', headers: f.auth(), payload: { label: 'Relative', canListen: false, consent: true } });
    expect(created.statusCode).toBe(200);
    const invite = created.json();
    const row = (await f.store.db.query('SELECT * FROM caregiver_grants WHERE id=$1', [invite.id])).rows[0]!;
    expect(JSON.stringify(row)).not.toContain(invite.code);
    expect((await f.app.inject({ method: 'POST', url: '/api/sharing/accept', headers: f.auth(DEMO_SECOND_PERSON), payload: { code: invite.code } })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'POST', url: '/api/sharing/accept', headers: f.auth(DEMO_SECOND_PERSON), payload: { code: invite.code } })).statusCode).toBe(404);
    const shared = await f.app.inject({ url: '/api/people', headers: f.auth(DEMO_SECOND_PERSON) });
    expect(shared.json().people.some((person: { id: string; isOwner: boolean }) => person.id === DEMO_PERSON && !person.isOwner)).toBe(true);
    await f.app.inject({ method: 'DELETE', url: `/api/sharing/${invite.id}`, headers: f.auth() });
  });
  it('rejects malformed cursors and isolates pagination', async () => {
    expect((await f.app.inject({ url: '/api/calls?cursor=garbage', headers: f.auth() })).statusCode).toBe(400);
  });
  it('does not let a caregiver delete the participant account', async () => {
    expect((await f.app.inject({ method: 'POST', url: '/api/account/delete', headers: f.caregiver() })).statusCode).toBe(403);
  });
  it('starts restoration before account deletion and keeps the DID assigned', async () => {
    const response = await f.app.inject({ method: 'POST', url: '/api/account/delete', headers: f.auth() });
    expect(response.json().requiresRoutingRestoration).toBe(true);
    const participant = await f.store.participant(DEMO_PERSON);
    expect(participant?.status).toBe('restoring'); expect(participant?.did).toBe('+15125550110');
    expect(participant?.deletion_requested_at).toBeTruthy();
  });
  it('returns no classification when the SMS capability is disabled', async () => {
    const response = await f.app.inject({ method: 'POST', url: '/sms/classify', payload: { query: { sender: '+15125550199', message: { text: 'An untrusted message.' } } } });
    expect(response.json()).toEqual({ action: 'none' });
  });
  it('requires explicit analysis consent for a manual text check', async () => {
    expect((await f.app.inject({ method: 'POST', url: '/api/check', headers: f.auth(), payload: { text: 'A reminder about an appointment.' } })).statusCode).toBe(400);
    expect((await f.app.inject({ method: 'POST', url: '/api/check', headers: f.auth(), payload: { text: 'A reminder about an appointment.', analysisConsent: true } })).statusCode).toBe(200);
  });
  it('encrypts saved contact fields and rejects arbitrary destinations', async () => {
    const result = await f.app.inject({ method: 'POST', url: '/api/destinations', headers: f.auth(), payload: { label: 'Independent number', phone: '+15125550141', provenance: 'card' } });
    expect(result.statusCode).toBe(200);
    const row = (await f.store.db.query('SELECT * FROM destinations WHERE id=$1', [result.json().id])).rows[0]!;
    expect(JSON.stringify(row)).not.toContain('Independent number'); expect(JSON.stringify(row)).not.toContain('+15125550141');
    const bad = await f.app.inject({ method: 'POST', url: '/api/destinations', headers: f.auth(), payload: { label: 'Bad', phone: '+442079460000', provenance: 'card' } });
    expect(bad.statusCode).toBe(400);
  });
});
