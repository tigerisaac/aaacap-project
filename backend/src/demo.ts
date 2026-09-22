import { randomUUID, createHash } from 'node:crypto';
import type { Store } from './store.js';
import { CONSENT_VERSION } from './voice.js';

export const DEMO_PERSON = '11111111-1111-4111-8111-111111111111';
export const DEMO_SECOND_PERSON = '22222222-2222-4222-8222-222222222222';
export const syntheticSid = (kind: 'CA' | 'RE', seed: string) => kind + createHash('sha256').update(seed).digest('hex').slice(0, 32);

export async function seedDemo(store: Store): Promise<void> {
  if (store.config.SHIELD_MODE !== 'demo') throw new Error('Demo data cannot be installed into a live service.');
  if ((await store.db.query('SELECT id FROM participants WHERE id=$1', [DEMO_PERSON])).rows.length) return;
  await store.db.transaction(async tx => {
    await tx.query(`INSERT INTO carrier_profiles(id,name,configuration,activation_steps,restoration_steps,validated_at,evidence_reference)
      VALUES('demo','Sample phone setup','Illustrative configuration; no live carrier test', $1,$2,now(),'synthetic-demo') ON CONFLICT DO NOTHING`,
    [JSON.stringify(['This is a demo. Do not change your phone settings.']), JSON.stringify(['Demo mode does not change carrier forwarding.'])]);
    for (const [id, subject, name, phone, did] of [
      [DEMO_PERSON, 'demo-participant', 'Pat', '+15125550100', '+15125550110'],
      [DEMO_SECOND_PERSON, 'demo-other', 'Alex', '+15125550101', '+15125550111']
    ]) {
      await tx.query(`INSERT INTO participants(id,auth_subject,name_enc,phone_enc,phone_hash,did,status,phone_verified_at,consent_version,consented_at,carrier_profile_id,last_routing_test_at)
        VALUES($1,$2,$3,$4,$5,$6,'active',now(),$7,now(),'demo',now())`, [id, subject,
        store.vault.seal(name!, `participant:${id}:name`), store.vault.seal(phone!, `participant:${id}:phone`), store.vault.hash(phone!), did, CONSENT_VERSION]);
    }
    const samples = [
      { minutes: 24, outcome: 'held', reason: 'prohibited_request', purpose: 'other', number: '+15125550123' },
      { minutes: 108, outcome: 'connected', reason: 'routine', purpose: 'prescription', number: '+15125550124' },
      { minutes: 196, outcome: 'voicemail', reason: 'known_missed', purpose: 'personal', number: '+15125550125' },
      { minutes: 380, outcome: 'verification', reason: 'sensitive_issue', purpose: 'other', number: '+15125550126' },
      { minutes: 1520, outcome: 'connected', reason: 'routine', purpose: 'appointment', number: '+15125550127' },
      { minutes: 1880, outcome: 'voicemail', reason: 'uncertain', purpose: 'unknown', number: '+15125550128' },
      { minutes: 3040, outcome: 'connected', reason: 'routine', purpose: 'delivery', number: '+15125550129' }
    ];
    for (const [index, sample] of samples.entries()) {
      const id = randomUUID(); const at = new Date(Date.now() - sample.minutes * 60000);
      await tx.query(`INSERT INTO call_sessions(id,participant_id,original_sid,caller_enc,state,outcome,reason,purpose,accepted_at,completed_at,created_at,deadline,expires_at)
        VALUES($1,$2,$3,$4,'ended',$5,$6,$7,$8,$9,$9,$9,now()+interval '30 days')`, [id, DEMO_PERSON, syntheticSid('CA', `sample-${index}`),
        store.vault.seal(sample.number, `call:${id}:caller`), sample.outcome, sample.reason, sample.purpose, sample.outcome === 'connected' ? at : null, at]);
      for (const kind of ['received', 'screening_finished', sample.outcome === 'connected' ? 'accepted' : 'not_connected', 'ended']) {
        await tx.query('INSERT INTO call_events(id,session_id,kind,happened_at) VALUES($1,$2,$3,$4)', [randomUUID(), id, kind, at]);
      }
      if (sample.outcome === 'voicemail') {
        await tx.query(`INSERT INTO voicemails(id,participant_id,session_id,recording_sid,duration,status,created_at,expires_at)
          VALUES($1,$2,$3,$4,28,'failed',$5,now()+interval '30 days')`, [randomUUID(), DEMO_PERSON, id, syntheticSid('RE', `sample-${index}`), at]);
      }
    }
    const destinationId = randomUUID();
    await tx.query('INSERT INTO destinations(id,participant_id,label_enc,phone_enc,provenance) VALUES($1,$2,$3,$4,$5)', [destinationId, DEMO_PERSON,
      store.vault.seal('Sample clinic', `destinations:${destinationId}:label`), store.vault.seal('+15125550140', `destinations:${destinationId}:phone`), 'statement']);
    const grantId = randomUUID();
    await tx.query(`INSERT INTO caregiver_grants(id,participant_id,token_hash,grantee_subject,label_enc,can_listen,expires_at,accepted_at)
      VALUES($1,$2,$3,'demo-caregiver',$4,false,now()+interval '2 days',now())`, [grantId, DEMO_PERSON, store.vault.hash(randomUUID()), store.vault.seal('Jordan', `grant:${grantId}:label`)]);
  });
}
