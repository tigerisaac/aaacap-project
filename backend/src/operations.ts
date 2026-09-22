import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Store } from './store.js';
import { normalizePhone } from './crypto.js';
import { CONSENT_VERSION } from './voice.js';

const evidence = z.string().trim().min(8).max(500);
const steps = z.array(z.string().trim().min(3).max(1000)).min(1).max(30);
export const requiredRoutingChecks = ['knownCallerRings', 'unknownCallerForwards', 'shieldCallbackRings',
  'digitOneConnects', 'silenceDoesNotConnect', 'wrongDigitDoesNotConnect', 'nativeVoicemailDoesNotConnect',
  'callerAbandonmentCancelsCallback', 'shieldCallbackCannotLoop', 'secondCallDoesNotOffer',
  'focusAndLockScreenChecked', 'carrierVoicemailRestores'] as const;
const routingChecks = z.object(Object.fromEntries(requiredRoutingChecks.map(key => [key, z.literal(true)])) as Record<typeof requiredRoutingChecks[number], z.ZodLiteral<true>>);
const carrierDraftSchema = z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/), name: z.string().min(3).max(120),
  configuration: z.string().min(10).max(2000), activationSteps: steps, restorationSteps: steps });
export const carrierSchema = carrierDraftSchema.extend({
  testedAt: z.iso.datetime(), evidenceReference: evidence, checks: routingChecks });
// Firebase UIDs are opaque strings, not UUIDs. Preserve the provider's exact subject.
export const enrollmentSchema = z.object({ authSubject: z.string().min(1).max(128), name: z.string().trim().min(1).max(60),
  phone: z.string(), shieldNumber: z.string(), carrierProfileId: z.string().min(3).max(80), phoneOwnershipEvidence: evidence });
export const routingTestSchema = z.object({ participantId: z.string().uuid(), testedAt: z.iso.datetime(),
  evidenceReference: evidence, checks: routingChecks });
const currentTest = (date: string) => {
  const age = Date.now() - new Date(date).getTime();
  if (age < -60000 || age > 14 * 86400000) throw new Error('Test evidence must be from the last 14 days, not the future.');
};

/** Trusted local operator entry points. Never expose these through the participant API. */
export class Operations {
  constructor(private readonly store: Store) {}

  async createCarrierDraft(input: unknown): Promise<string> {
    const data = carrierDraftSchema.parse(input);
    await this.store.db.query('INSERT INTO carrier_profiles(id,name,configuration,activation_steps,restoration_steps) VALUES($1,$2,$3,$4,$5)',
      [data.id, data.name, data.configuration, JSON.stringify(data.activationSteps), JSON.stringify(data.restorationSteps)]);
    return data.id;
  }

  async importCarrier(input: unknown): Promise<string> {
    const data = carrierSchema.parse(input); currentTest(data.testedAt);
    await this.store.db.transaction(async tx => {
      // Profiles are immutable. Changed phone/iOS/carrier settings require a new profile ID.
      const result = await tx.query(`INSERT INTO carrier_profiles(id,name,configuration,activation_steps,restoration_steps,validated_at,evidence_reference)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET validated_at=EXCLUDED.validated_at,evidence_reference=EXCLUDED.evidence_reference
        WHERE carrier_profiles.validated_at IS NULL AND carrier_profiles.name=EXCLUDED.name
          AND carrier_profiles.configuration=EXCLUDED.configuration AND carrier_profiles.activation_steps=EXCLUDED.activation_steps
          AND carrier_profiles.restoration_steps=EXCLUDED.restoration_steps RETURNING id`, [data.id, data.name, data.configuration, JSON.stringify(data.activationSteps),
        JSON.stringify(data.restorationSteps), data.testedAt, data.evidenceReference]);
      if (!result.rows.length) throw new Error('Carrier profiles are immutable after validation.');
      await this.store.audit(tx, null, 'carrier_profile_imported', { profileId: data.id });
    });
    return data.id;
  }

  async enroll(input: unknown, verifyOwnedDID: (phone: string) => Promise<void>): Promise<string> {
    const data = enrollmentSchema.parse(input);
    const phone = normalizePhone(data.phone); const did = normalizePhone(data.shieldNumber);
    if (!phone || !did || phone === did) throw new Error('Two different US/Canadian numbers are required.');
    const profile = (await this.store.db.query('SELECT * FROM carrier_profiles WHERE id=$1', [data.carrierProfileId])).rows[0];
    if (!profile) throw new Error('A carrier profile is required; unvalidated profiles can only run supervised tests.');
    await verifyOwnedDID(did);
    const id = randomUUID();
    await this.store.db.transaction(async tx => {
      await tx.query(`INSERT INTO participants(id,auth_subject,name_enc,phone_enc,phone_hash,did,phone_verified_at,carrier_profile_id,routing_evidence)
        VALUES($1,$2,$3,$4,$5,$6,now(),$7,$8)`, [id, data.authSubject, this.store.vault.seal(data.name, `participant:${id}:name`),
        this.store.vault.seal(phone, `participant:${id}:phone`), this.store.vault.hash(phone), did, data.carrierProfileId, data.phoneOwnershipEvidence]);
      await this.store.audit(tx, id, 'participant_enrolled', { profileId: data.carrierProfileId });
    });
    return id;
  }

  async recordRoutingTest(input: unknown): Promise<void> {
    const data = routingTestSchema.parse(input); currentTest(data.testedAt);
    await this.store.db.transaction(async tx => {
      const participant = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [data.participantId])).rows[0];
      if (!participant || !['setup', 'active', 'paused'].includes(participant.status) || participant.active_call_id) throw new Error('Participant is unavailable or has an active call.');
      await tx.query('UPDATE participants SET last_routing_test_at=$2,routing_evidence=$3,routing_test_until=NULL WHERE id=$1', [data.participantId, data.testedAt, data.evidenceReference]);
      await this.store.audit(tx, data.participantId, 'routing_test_recorded', { testedAt: data.testedAt });
    });
  }

  async beginSupervisedTest(input: unknown): Promise<void> {
    const data = z.object({ participantId: z.string().uuid(), operatorPresent: z.literal(true), participantPresent: z.literal(true) }).parse(input);
    await this.store.db.transaction(async tx => {
      const p = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [data.participantId])).rows[0];
      if (!p || !['setup', 'paused'].includes(p.status) || p.active_call_id || !p.phone_verified_at || !p.carrier_profile_id
        || p.consent_version !== CONSENT_VERSION || !p.consented_at) throw new Error('Test requires verified enrollment, consent, and no active call.');
      await tx.query("UPDATE participants SET status='setup',routing_test_until=now()+interval '30 minutes' WHERE id=$1", [p.id]);
      await this.store.audit(tx, p.id, 'supervised_routing_test_started');
    });
  }

  async activate(id: string): Promise<void> {
    z.string().uuid().parse(id);
    await this.store.db.transaction(async tx => {
      const p = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!p || !['setup', 'paused'].includes(p.status) || p.active_call_id) throw new Error('Participant cannot be activated in this state.');
      if (!p.phone_verified_at || p.consent_version !== CONSENT_VERSION || !p.consented_at || !p.last_routing_test_at) throw new Error('Phone verification, participant consent, and routing test are required.');
      currentTest(new Date(p.last_routing_test_at).toISOString());
      if (!(await tx.query('SELECT id FROM carrier_profiles WHERE id=$1 AND validated_at IS NOT NULL', [p.carrier_profile_id])).rows.length) throw new Error('Carrier profile is not validated.');
      await tx.query("UPDATE participants SET status='active',routing_test_until=NULL WHERE id=$1", [id]);
      await this.store.audit(tx, id, 'participant_activated');
    });
  }

  async endSupervisedTest(id: string): Promise<void> {
    z.string().uuid().parse(id);
    await this.store.db.transaction(async tx => {
      await tx.query('UPDATE participants SET routing_test_until=NULL WHERE id=$1', [id]);
      if (await this.store.participant(id, tx)) await this.store.audit(tx, id, 'supervised_routing_test_stopped');
    });
  }

  async pauseAll(paused: boolean): Promise<void> {
    await this.store.db.transaction(async tx => {
      await tx.query("UPDATE service_settings SET value=$1 WHERE key='offers_paused'", [JSON.stringify(paused)]);
      await this.store.audit(tx, null, paused ? 'global_offers_paused' : 'global_offers_resumed');
    });
  }

  async confirmRestoration(input: unknown): Promise<void> {
    const data = z.object({ participantId: z.string().uuid(), evidenceReference: evidence,
      forwardingDisabled: z.literal(true), ordinaryCallsVerified: z.literal(true), carrierVoicemailVerified: z.literal(true) }).parse(input);
    await this.store.db.transaction(async tx => {
      const p = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [data.participantId])).rows[0];
      if (!p || p.status !== 'restoring' || p.active_call_id) throw new Error('Restoration must be requested, with no active call.');
      const active = await tx.query("SELECT id FROM call_sessions WHERE participant_id=$1 AND state <> 'ended' LIMIT 1", [p.id]);
      if (active.rows.length) throw new Error('Wait for all calls to end before confirming restoration.');
      await tx.query("UPDATE participants SET status='offboarded',restored_at=now(),routing_evidence=$2,routing_test_until=NULL WHERE id=$1", [p.id, data.evidenceReference]);
      await tx.query('DELETE FROM push_devices WHERE participant_id=$1', [p.id]);
      await tx.query('UPDATE caregiver_grants SET revoked_at=now() WHERE participant_id=$1', [p.id]);
      await this.store.audit(tx, p.id, 'restoration_confirmed');
    });
  }

  async purgeRequestedAccount(id: string): Promise<void> {
    z.string().uuid().parse(id);
    await this.store.db.transaction(async tx => {
      const p = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!p || p.status !== 'offboarded' || !p.restored_at || !p.deletion_requested_at || p.active_call_id) throw new Error('A deletion request and confirmed restoration are required.');
      const recordings = (await tx.query('SELECT * FROM voicemails WHERE participant_id=$1', [id])).rows;
      for (const row of recordings) await this.store.job(tx, 'purge_provider_recording', `account-purge:${row.recording_sid}`, { recordingSid: row.recording_sid });
      for (const table of ['voicemails', 'call_sessions', 'trusted_numbers', 'destinations', 'caregiver_grants', 'push_devices', 'audit_events']) {
        await tx.query(`DELETE FROM ${table} WHERE participant_id=$1`, [id]);
      }
      // Keep a non-personal DID tombstone so unexpected residual forwarding cannot be reassigned.
      await tx.query(`UPDATE participants SET auth_subject=$2,name_enc=$3,phone_enc=$4,phone_hash=$5,
        carrier_profile_id=NULL,routing_evidence=NULL,phone_verified_at=NULL,consent_version=NULL,consented_at=NULL,
        last_routing_test_at=NULL,guard_until=NULL WHERE id=$1`, [id, `deleted:${randomUUID()}`,
        this.store.vault.seal('', `participant:${id}:name`), this.store.vault.seal('', `participant:${id}:phone`), this.store.vault.hash(randomUUID())]);
    });
  }
}
