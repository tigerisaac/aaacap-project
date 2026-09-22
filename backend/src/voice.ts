import { randomUUID } from 'node:crypto';
import type { Queryable, Row } from './db.js';
import { Store } from './store.js';
import { screen, type Screener, type Decision } from './screening.js';
import type { Telephony } from './telephony.js';
import { terminal } from './telephony.js';
import * as xml from './twiml.js';

export type VoiceParams = Record<string, string>;
export const CONSENT_VERSION = 'shield-pilot-2026-09-v1';
const callSid = (value?: string): value is string => !!value && /^CA[a-f0-9]{32}$/i.test(value);
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);

export class VoiceService {
  constructor(readonly store: Store, readonly telephony: Telephony, readonly screener: Screener) {}

  private async withSession<T>(id: string, fn: (tx: Queryable, session: Row, participant: Row) => Promise<T>): Promise<T | undefined> {
    if (!uuid(id)) return;
    const initial = await this.store.session(id);
    if (!initial) return;
    // Always lock participant first, then call. All call mutations share this lock order.
    return this.store.db.transaction(async tx => {
      const participant = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [initial.participant_id])).rows[0];
      const session = (await tx.query('SELECT * FROM call_sessions WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!participant || !session) return undefined;
      return fn(tx, session, participant);
    });
  }

  private async eligible(participant: Row, tx: Queryable): Promise<boolean> {
    const config = this.store.config;
    if (config.SHIELD_MODE !== 'demo' && !config.LIVE_OFFERING_ENABLED) return false;
    const supervisedTest = participant.status === 'setup' && participant.routing_test_until && new Date(participant.routing_test_until).getTime() > Date.now();
    if ((!supervisedTest && participant.status !== 'active') || !participant.phone_verified_at
      || participant.consent_version !== CONSENT_VERSION || !participant.consented_at) return false;
    if (!supervisedTest && (!participant.last_routing_test_at || Date.now() - new Date(participant.last_routing_test_at).getTime() > 14 * 86400000)) return false;
    const profile = (await tx.query('SELECT validated_at FROM carrier_profiles WHERE id=$1', [participant.carrier_profile_id])).rows[0];
    const paused = (await tx.query('SELECT value FROM service_settings WHERE key=$1', ['offers_paused'])).rows[0]?.value;
    return !!profile && (!!supervisedTest || !!profile.validated_at) && paused === false;
  }

  async inbound(params: VoiceParams): Promise<string> {
    if (!callSid(params.CallSid) || !params.To) return xml.hangup();
    return this.store.db.transaction(async tx => {
      const participant = (await tx.query('SELECT * FROM participants WHERE did=$1 FOR UPDATE', [params.To])).rows[0];
      if (!participant || participant.status === 'offboarded') return xml.finish('This screening number is no longer active.');
      if ((await tx.query('SELECT id FROM call_sessions WHERE original_sid=$1', [params.CallSid])).rows.length) return xml.hangup();
      if ((await tx.query('SELECT id FROM participants WHERE did=$1', [params.From ?? ''])).rows.length) {
        await this.store.audit(tx, participant.id, 'loop_guard');
        return xml.hangup();
      }
      const id = randomUUID();
      const caller = /^\+[1-9]\d{7,14}$/.test(params.From ?? '') ? params.From! : 'Unknown number';
      const trusted = (await tx.query('SELECT id FROM trusted_numbers WHERE participant_id=$1 AND phone_hash=$2', [participant.id, this.store.vault.hash(caller)])).rows.length > 0;
      const guarded = !!participant.active_call_id || (!!participant.guard_until && new Date(participant.guard_until).getTime() > Date.now());
      const underLimit = await this.store.quota(tx, `screenings:${participant.id}`, this.store.config.MAX_SCREENINGS_PER_PARTICIPANT_DAY);
      const mayScreen = !trusted && !guarded && underLimit && await this.eligible(participant, tx);
      const reason = trusted ? 'known_missed' : guarded ? 'busy_guard' : !underLimit ? 'limit_reached' : mayScreen ? 'screening' : 'message_only';
      await tx.query(`INSERT INTO call_sessions(id,participant_id,original_sid,caller_enc,state,outcome,reason,deadline,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '60 seconds',now()+($8 * interval '1 day'))`,
      [id, participant.id, params.CallSid, this.store.vault.seal(caller, `call:${id}:caller`), mayScreen ? 'screening' : 'voicemail',
        mayScreen ? 'screening' : 'voicemail', reason, this.store.config.RETENTION_DAYS]);
      await this.store.event(tx, id, 'received');
      if (!mayScreen) {
        // A daily inbound limit must bound billable voicemail too. It does not silently drop an existing call.
        if (!underLimit) {
          await tx.query("UPDATE call_sessions SET state='ended',outcome='missed',reason='capacity_exceeded',completed_at=now() WHERE id=$1", [id]);
          return xml.finish('This service cannot take another message right now. Please try again later.');
        }
        await this.store.event(tx, id, 'voicemail_offered');
        await tx.query("UPDATE call_sessions SET deadline=now()+($2 * interval '1 second') WHERE id=$1", [id, this.store.config.MAX_VOICEMAIL_SECONDS + 30]);
        return xml.voicemail(this.store.config, id);
      }
      await this.store.event(tx, id, 'screening_started');
      return xml.introduction(this.store.config, id);
    });
  }

  async screeningResult(id: string, params: VoiceParams): Promise<string> {
    const shouldEvaluate = await this.withSession(id, async (tx, session) => {
      if (session.original_sid !== params.CallSid || session.state !== 'screening') return false;
      if (new Date(session.deadline).getTime() <= Date.now()) return false;
      await tx.query("UPDATE call_sessions SET state='evaluating' WHERE id=$1", [id]);
      return true;
    });
    if (!shouldEvaluate) return xml.hangup();
    const withinBudget = params.Digits === '2' || await this.store.quota(this.store.db, 'classifications:global', this.store.config.MAX_CLASSIFICATIONS_PER_DAY);
    const decision: Decision = !withinBudget ? { route: 'message', reason: 'limit_reached', purpose: 'unknown' } : params.Digits === '2'
      ? { route: 'message', reason: 'message_only', purpose: 'unknown' }
      : await screen(this.screener, params.SpeechResult ?? '', this.store.config.MODEL_TIMEOUT_MS);
    return await this.withSession(id, async (tx, session, participant) => {
      if (session.state !== 'evaluating' || new Date(session.deadline).getTime() <= Date.now()) return xml.hangup();
      await tx.query('UPDATE call_sessions SET purpose=$2,reason=$3,model_version=$4 WHERE id=$1', [id, decision.purpose, decision.reason, this.screener.version]);
      await this.store.event(tx, id, 'screening_finished');
      if (decision.route === 'refuse' || decision.route === 'verify') {
        await tx.query("UPDATE call_sessions SET state='ended',outcome=$2,completed_at=now() WHERE id=$1", [id, decision.route === 'refuse' ? 'held' : 'verification']);
        await this.store.event(tx, id, 'not_connected');
        await this.store.job(tx, 'notify', `decision:${id}`, { participantId: participant.id });
        return xml.finish('We cannot connect this call. The person you called can follow up independently if needed.');
      }
      let reason = decision.reason;
      if (decision.route === 'offer') {
        const guarded = participant.active_call_id || (participant.guard_until && new Date(participant.guard_until).getTime() > Date.now());
        if (!guarded && !session.callback_attempted && await this.eligible(participant, tx)) {
          const localQuota = await this.store.quota(tx, `callbacks:${participant.id}`, this.store.config.MAX_CALLBACKS_PER_PARTICIPANT_DAY);
          const globalQuota = localQuota && await this.store.quota(tx, 'callbacks:global', this.store.config.MAX_CALLBACKS_PER_DAY);
          if (globalQuota) {
            await tx.query("UPDATE call_sessions SET state='offering',outcome='offered',callback_attempted=true,deadline=now()+interval '60 seconds' WHERE id=$1", [id]);
            await tx.query('UPDATE participants SET active_call_id=$2 WHERE id=$1', [participant.id, id]);
            await this.store.event(tx, id, 'offered');
            return xml.callback(this.store.config, id, participant.did, this.store.phone(participant));
          }
          reason = 'limit_reached';
        } else reason = guarded ? 'busy_guard' : 'message_only';
      }
      await tx.query("UPDATE call_sessions SET state='voicemail',outcome='voicemail',reason=$2,deadline=now()+($3 * interval '1 second') WHERE id=$1",
        [id, reason, this.store.config.MAX_VOICEMAIL_SECONDS + 30]);
      await this.store.event(tx, id, 'voicemail_offered');
      return xml.voicemail(this.store.config, id);
    }) ?? xml.hangup();
  }

  private async validChild(session: Row, participant: Row, sid?: string): Promise<boolean> {
    if (!callSid(sid) || sid === session.original_sid || (session.child_sid && session.child_sid !== sid)) return false;
    const call = await this.telephony.call(sid);
    return call.parentSid === session.original_sid && call.to === this.store.phone(participant) && call.from === participant.did;
  }

  async whisper(id: string, params: VoiceParams): Promise<string> {
    const initial = uuid(id) ? await this.store.session(id) : undefined;
    const participant = initial ? await this.store.participant(initial.participant_id) : undefined;
    if (!initial || !participant || !await this.validChild(initial, participant, params.CallSid)) return xml.hangup();
    return await this.withSession(id, async (tx, session, owner) => {
      if (!['offering', 'accepting'].includes(session.state) || owner.active_call_id !== id
        || (session.child_sid && session.child_sid !== params.CallSid) || new Date(session.deadline).getTime() <= Date.now()
        || !await this.eligible(owner, tx)) return xml.hangup();
      await tx.query("UPDATE call_sessions SET child_sid=$2,state='accepting' WHERE id=$1", [id, params.CallSid]);
      await this.store.event(tx, id, 'private_prompt');
      return xml.whisper(this.store.config, id, session.purpose ?? 'unknown');
    }) ?? xml.hangup();
  }

  async accept(id: string, params: VoiceParams): Promise<string> {
    const initial = uuid(id) ? await this.store.session(id) : undefined;
    if (!initial || !initial.child_sid || initial.child_sid !== params.CallSid || initial.child_sid === initial.original_sid) return xml.hangup();
    const original = await this.telephony.call(initial.original_sid);
    if (terminal(original.status)) return xml.hangup();
    return await this.withSession(id, async (tx, session, participant) => {
      if (session.child_sid !== params.CallSid || participant.active_call_id !== id) return xml.hangup();
      if (session.state === 'accepted' && session.accepted_at && params.Digits === '1') return xml.accepted();
      if (session.state !== 'accepting' || new Date(session.deadline).getTime() <= Date.now()) return xml.hangup();
      if (params.Digits !== '1' || !await this.eligible(participant, tx)) {
        await tx.query("UPDATE call_sessions SET state='voicemail',outcome='voicemail',reason=$2 WHERE id=$1", [id, params.Digits === '2' ? 'declined' : 'no_acceptance']);
        await this.store.event(tx, id, 'not_accepted');
        return xml.hangup();
      }
      await tx.query("UPDATE call_sessions SET state='accepted',outcome='connected',accepted_at=now(),deadline=now()+($2 * interval '1 second') WHERE id=$1", [id, this.store.config.MAX_BRIDGE_SECONDS + 15]);
      await this.store.event(tx, id, 'accepted');
      return xml.accepted();
    }) ?? xml.hangup();
  }

  async dialComplete(id: string, params: VoiceParams): Promise<string> {
    return await this.withSession(id, async (tx, session, participant) => {
      if (session.original_sid !== params.CallSid || !session.callback_attempted
        || (session.child_sid && session.child_sid !== params.DialCallSid)) return xml.hangup();
      if (!terminal(params.DialCallStatus ?? '')) return xml.hangup();
      await tx.query('UPDATE call_sessions SET child_terminal=true WHERE id=$1', [id]);
      await this.store.release(tx, participant.id, id);
      if (session.accepted_at || session.state === 'ended') {
        await tx.query("UPDATE call_sessions SET state='ended',completed_at=COALESCE(completed_at,now()) WHERE id=$1", [id]);
        await this.store.event(tx, id, 'ended');
        return xml.hangup();
      }
      await tx.query("UPDATE call_sessions SET state='voicemail',outcome='voicemail',reason=$2,deadline=now()+($3 * interval '1 second') WHERE id=$1", [id,
        session.reason === 'declined' ? 'declined' : 'no_acceptance', this.store.config.MAX_VOICEMAIL_SECONDS + 30]);
      await this.store.event(tx, id, 'voicemail_offered');
      return xml.voicemail(this.store.config, id);
    }) ?? xml.hangup();
  }

  async childStatus(id: string, params: VoiceParams): Promise<void> {
    const initial = uuid(id) ? await this.store.session(id) : undefined;
    const participant = initial ? await this.store.participant(initial.participant_id) : undefined;
    if (!initial || !participant || !initial.callback_attempted || !await this.validChild(initial, participant, params.CallSid)) return;
    await this.withSession(id, async (tx, session) => {
      if (session.child_sid && session.child_sid !== params.CallSid) return;
      await tx.query('UPDATE call_sessions SET child_sid=$2 WHERE id=$1', [id, params.CallSid]);
      // A terminal event is monotonic; late ringing/answered cannot resurrect it.
      if (terminal(params.CallStatus ?? '')) {
        await tx.query('UPDATE call_sessions SET child_terminal=true WHERE id=$1', [id]);
        await this.store.release(tx, session.participant_id, id);
      }
    });
  }

  async originalStatus(params: VoiceParams): Promise<void> {
    if (!callSid(params.CallSid) || !terminal(params.CallStatus ?? '')) return;
    const session = (await this.store.db.query('SELECT id FROM call_sessions WHERE original_sid=$1', [params.CallSid])).rows[0];
    if (!session) return;
    await this.withSession(session.id, async (tx, current) => {
      await tx.query(`UPDATE call_sessions SET state='ended',completed_at=COALESCE(completed_at,now()),
        reason=CASE WHEN state IN ('screening','evaluating','offering','accepting') AND accepted_at IS NULL THEN 'abandoned' ELSE reason END,
        outcome=CASE WHEN outcome IN ('screening','offered') THEN 'missed' ELSE outcome END WHERE id=$1`, [current.id]);
      await this.store.event(tx, current.id, 'ended');
      if (current.callback_attempted) await this.store.job(tx, 'cancel_children', `cancel:${current.id}`, { sessionId: current.id });
      await this.store.job(tx, 'notify', `ended:${current.id}`, { participantId: current.participant_id });
    });
  }

  async voicemailComplete(id: string, params: VoiceParams): Promise<string> {
    return await this.withSession(id, async (tx, session) => {
      if (session.original_sid !== params.CallSid) return xml.hangup();
      await tx.query("UPDATE call_sessions SET state='ended',completed_at=COALESCE(completed_at,now()) WHERE id=$1", [id]);
      await this.store.event(tx, id, 'ended');
      return xml.finish('Thank you. Goodbye.');
    }) ?? xml.hangup();
  }

  async recordingReady(id: string, params: VoiceParams): Promise<void> {
    if (!/^RE[a-f0-9]{32}$/i.test(params.RecordingSid ?? '') || params.RecordingStatus !== 'completed') return;
    const duration = Number(params.RecordingDuration);
    if (!Number.isFinite(duration) || duration < 0 || duration > this.store.config.MAX_VOICEMAIL_SECONDS + 5) return;
    await this.withSession(id, async (tx, session) => {
      if (params.CallSid !== session.original_sid) return;
      if (!(await tx.query("SELECT id FROM call_events WHERE session_id=$1 AND kind='voicemail_offered'", [id])).rows.length) return;
      const voicemailId = randomUUID();
      const result = await tx.query(`INSERT INTO voicemails(id,participant_id,session_id,recording_sid,duration,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+($6 * interval '1 day')) ON CONFLICT(recording_sid) DO NOTHING RETURNING id`,
      [voicemailId, session.participant_id, id, params.RecordingSid, Math.round(duration), this.store.config.RETENTION_DAYS]);
      if (!result.rows.length) return;
      await this.store.job(tx, 'ingest_recording', `ingest:${params.RecordingSid}`, { voicemailId });
      await this.store.event(tx, id, 'message_received');
    });
  }
}
