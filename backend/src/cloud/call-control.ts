import { SharedProbes } from './shared-probes.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../auth.js';
import type { CloudStore } from './store.js';
import { ForwardingStore, screeningOpen, type ForwardingCall } from './forwarding-store.js';
import { CallControlProvider, validControlId } from './call-control-provider.js';
import { callerNumber, validRecordingId, verifyTelnyx } from './forwarding-provider.js';
import { forwardingIdentity, normalizeForwardedNumber } from './shared-routing.js';
import { streamTicket } from './forwarding-live.js';
import { CallMonitor } from './monitoring.js';
import { purposes } from './copy.js';
import { MESSAGE_CAPTURE_SECONDS } from './message-audio.js';

const eventSchema = z.object({ data: z.object({ id: z.string().min(1).max(200), event_type: z.string().max(100),
  occurred_at: z.string().datetime({ offset: true }), payload: z.object({ call_control_id: z.string().refine(validControlId),
    call_leg_id: z.string().min(1).max(200), connection_id: z.string(), from: z.string().optional(), to: z.string().optional(),
    direction: z.string().optional(), client_state: z.string().max(400).nullable().optional(), sip_headers: z.unknown().optional(),
    digits: z.string().max(128).optional(), digit: z.string().max(1).optional(), recording_id: z.string().optional(), recording_started_at: z.string().optional(), recording_ended_at: z.string().optional(),
    transcription_data: z.object({ is_final: z.boolean().optional(), transcript: z.string().max(8000).optional(), transcription_track: z.string().optional() }).optional()
  }) }) });
type Event = z.infer<typeof eventSchema>['data'];
const VOICE = 'AWS.Polly.Joanna';
const TTL = 2 * 3600_000;
/** Durable call state and command receipts survive webhook retries and multiple API/bridge instances. */
export class SharedCallControl {
  readonly f: ForwardingStore;
  constructor(readonly store: CloudStore, readonly provider = new CallControlProvider(store.config)) { this.f = new ForwardingStore(store); }
  async call(id: string) { return (await this.store.callRef(id).get()).data() as ForwardingCall | undefined; }
  /** One executor per call. A contended webhook gets 503 and Telnyx retries it; no in-memory global call lock. */
  async exclusive<T>(key: string, run: () => Promise<T>): Promise<T> {
    const s = this.store, ref = s.db.collection('callControlLocks').doc(s.vault.hash(key)), token = randomUUID();
    await s.db.runTransaction(async tx => {
      const old = (await tx.get(ref)).data();
      if (old?.until > s.now()) throw new HttpError(503, 'call_busy');
      tx.set(ref, { token, until: s.now() + 25_000, expiresAt: s.now() + TTL });
    });
    try { return await run(); }
    finally { await s.db.runTransaction(async tx => { if ((await tx.get(ref)).data()?.token === token) tx.delete(ref); }); }
  }
  /** Never repeat a potentially successful command outside Telnyx's short deduplication window. */
  async command(sid: string, name: string, body: Record<string, unknown>, key: string) {
    const s = this.store, id = s.vault.hash(`${sid}:${key}`), ref = s.db.collection('callControlCommands').doc(id);
    const old = await s.db.runTransaction(async tx => {
      const d = (await tx.get(ref)).data();
      if (!d) tx.create(ref, { startedAt: s.now(), expiresAt: s.now() + TTL });
      return d;
    });
    if (old?.done) return old.resultEnc ? JSON.parse(s.vault.open(old.resultEnc, `command:${id}`)) : undefined;
    if (old && (name === 'dial' || s.now() - old.startedAt > 50_000)) throw new Error('command_outcome_uncertain');
    const result = name === 'dial' ? await this.provider.request('/calls', { ...body, command_id: id })
      : await this.provider.action(sid, name, { ...body, command_id: id });
    await ref.update({ done: true, ...(result ? { resultEnc: s.vault.seal(JSON.stringify(result), `command:${id}`) } : {}) });
    return result;
  }
  async hangup(sid: string) {
    try { await this.provider.action(sid, 'hangup', { command_id: this.store.vault.hash(`${sid}:hangup`) }); }
    catch (error) { const status = await this.provider.request(`/calls/${encodeURIComponent(sid)}`).catch(() => undefined); if (status?.is_alive !== false) throw error; }
  }
  async deadline(c: ForwardingCall, seconds: number) {
    const ref = this.store.db.collection('callControlDeadlines').doc(c.id);
    await this.store.db.runTransaction(async tx => {
      if ((await tx.get(ref)).data()?.phaseSeconds === seconds) return;
      tx.set(ref, { callId: c.id, phaseSeconds: seconds, dueAt: this.store.now() + seconds * 1000, expiresAt: this.store.now() + TTL });
    });
  }
  async stop(c: ForwardingCall) {
    await Promise.all([this.hangup(c.parentSid), ...(c.childSid ? [this.hangup(c.childSid)] : [])]);
    await this.f.ended(c.parentSid);
    await new CallMonitor(this.f).end(c.id);
  }
  async speak(c: ForwardingCall, phase: string, payload: string) {
    return this.command(c.parentSid, 'speak', { payload, voice: VOICE, client_state: this.provider.state(c.id, phase) }, phase);
  }
  async answer(c: ForwardingCall) {
    // This provider operation captures even speech overlapping the greeting/model startup.
    await this.store.callRef(c.id).update({ captureFromAnswer: true });
    const result = await this.command(c.parentSid, 'answer', { client_state: this.provider.state(c.id, 'inbound'), send_silence_when_idle: true,
      record: 'record-from-answer', record_channels: 'single', record_track: 'inbound', record_format: 'mp3',
      record_max_length: MESSAGE_CAPTURE_SECONDS, record_timeout_secs: 0 }, 'answer');
    // A durable job also covers a missing recording-saved webhook.
    if (validRecordingId(result?.recording_id ?? '')) await this.f.recording(c.parentSid, result.recording_id, 0);
  }
  async voicemail(c: ForwardingCall) {
    if (c.acceptedAt || c.state !== 'voicemail') return;
    await this.deadline(c, 80);
    await this.speak(c, 'voicemail', c.captureFromAnswer
      ? 'You have reached Shield voicemail. Please leave a message. Press pound when finished.'
      : 'You have reached Shield voicemail. Please leave a message after the tone. Press pound when finished.');
  }
  async outcome(id: string) {
    return this.exclusive(id, async () => {
      const c = await this.call(id); if (!c || c.transport !== 'call-control') return;
      await this.command(c.parentSid, 'streaming_stop', {}, 'stop-stream').catch(() => undefined);
      if (c.state === 'voicemail') return this.voicemail(c);
      if (c.state !== 'offering') return this.stop(c);
      await this.deadline(c, 45);
      const monitored = await new CallMonitor(this.f).begin(c.id);
      // Finish the disclosure before placing the recipient call, so acceptance cannot race past it.
      await this.speak(c, 'offer', monitored
        ? 'Please hold while Shield offers your call. If it connects, an AI assistant will transcribe the call to help protect against fraud.'
        : 'Please hold while Shield offers your call.');
    });
  }
  async handle(e: Event) {
    const s = this.store, p = e.payload, sid = p.call_control_id, state = this.provider.readState(p.client_state);
    let c = await this.f.find(sid);
    if (!c && state) c = await this.call(state.id);
    const lock = c?.id ?? sid;
    return this.exclusive(lock, async () => {
      const receipt = s.db.collection('callControlEvents').doc(s.vault.hash(e.id));
      if ((await receipt.get()).exists) return;
      if (!await new SharedProbes(s, this.provider).handle(e.event_type, e.payload)) await this.process(e);
      await receipt.set({ expiresAt: s.now() + TTL });
    });
  }
  async process(e: Event) {
    const s = this.store, p = e.payload, sid = p.call_control_id, phase = this.provider.readState(p.client_state);
    let c = await this.f.find(sid);
    if (!c && phase) c = await this.call(phase.id);
    if (e.event_type === 'call.initiated' && p.direction === 'incoming') {
      if (c) {
        if (c.parentSid === sid && c.parentLegId === p.call_leg_id && c.state !== 'ended') {
          if (!(await s.db.collection('callControlDeadlines').doc(c.id).get()).exists) await this.deadline(c, 90);
          await this.answer(c);
        }
        return;
      }
      // A prior hangup tombstone prevents delayed initiation from resurrecting a call.
      if ((await s.keyRef(sid).get()).exists || s.now() - Date.parse(e.occurred_at) > 30_000) return;
      const diverted = forwardingIdentity(p.sip_headers), to = normalizeForwardedNumber(p.to ?? '');
      if (!diverted || to !== s.config.TELNYX_NUMBER || p.from === to) { await this.hangup(sid); return; }
      c = await this.f.begin(sid, to, callerNumber(p.from), { diverted, legId: p.call_leg_id });
      if (!c || c.state === 'ended') { await this.hangup(sid); return; }
      await this.deadline(c, 90);
      await this.answer(c);
      return;
    }
    if (!c) {
      if (e.event_type === 'call.recording.saved' && validRecordingId(p.recording_id ?? '')) {
        // A delayed callback after account deletion still gets provider cleanup, never a message.
        const ref = s.db.collection('forwardingRecordings').doc(p.recording_id!);
        await s.db.runTransaction(async tx => { if (!(await tx.get(ref)).exists) tx.create(ref, { callId: 'deleted', parentSid: sid,
          provider: 'telnyx', transport: 'call-control', status: 'pending', createdAt: s.now(), expiresAt: s.now() }); });
        return;
      }
      if (e.event_type === 'call.hangup') { await s.keyRef(sid).set({ ended: true, expiresAt: s.now() + TTL }); return; }
      // A callback can precede initiation or a dial response. Ask for retry rather than discard it.
      if (['call.answered', 'call.gather.ended', 'call.speak.ended'].includes(e.event_type)) throw new HttpError(503, 'call_not_bound');
      return;
    }
    if (c.transport !== 'call-control') return;
    const inbound = sid === c.parentSid && p.call_leg_id === c.parentLegId;
    if (!inbound && sid !== c.childSid) {
      const ends = this.f.callEndpoints(c);
      if (!phase || phase.id !== c.id || phase.phase !== 'recipient' || !ends || p.from !== ends.shieldNumber || p.to !== ends.phone
        || !['call.initiated', 'call.answered', 'call.hangup'].includes(e.event_type)) return;
      if (!await this.f.bindChild(c.id, sid, c.parentSid)) { await this.hangup(sid); return; }
      c = (await this.call(c.id))!;
    }
    if (!inbound && sid !== c.childSid) return;
    if (e.event_type === 'call.hangup') {
      if (inbound) {
        if (c.childSid && !c.monitorIntervenedAt) await this.hangup(c.childSid);
        // An intervention parks the recipient for the warning. Keep the slot until that leg ends too.
        if (!c.childSid || !c.monitorIntervenedAt) await this.f.ended(c.parentSid);
        await new CallMonitor(this.f).end(c.id);
      }
      else if (c.acceptedAt) await this.stop(c);
      else { const next = await this.f.dialEnded(c.id, c.parentSid, sid, 'completed'); if (next) await this.voicemail(next); }
      return;
    }
    if (e.event_type === 'call.recording.saved' && inbound && validRecordingId(p.recording_id ?? '')) {
      const duration = (Date.parse(p.recording_ended_at ?? '') - Date.parse(p.recording_started_at ?? '')) / 1000;
      await this.f.recording(c.parentSid, p.recording_id!, duration);
      // record_stop before bridging also emits this event; it must never hang up an accepted call.
      if (!c.acceptedAt && c.state === 'voicemail') await this.hangup(c.parentSid);
      return;
    }
    if (e.event_type === 'call.speak.ended' && !inbound && phase?.phase === 'warning' && c.monitorIntervenedAt) { await this.hangup(sid); return; }
    if (c.state === 'ended') return;
    if (e.event_type === 'call.answered') {
      if (inbound) {
        if (c.state === 'voicemail') return this.voicemail(c);
        if (c.state === 'screening') await this.speak(c, 'greeting', "I'm Shield, an AI call assistant. I may save your message if this call isn't connected. Who's calling, and what is the call about?");
      } else {
        const whisper = await this.f.whisper(c.id, sid, c.parentSid); if (!whisper) return;
        await this.command(sid, 'gather_using_speak', { payload: `Shield screened a call about ${purposes[c.purpose as keyof typeof purposes] ?? 'a routine matter'}. This does not verify who is calling. Press 1 to connect, or 2 for voicemail.`,
          voice: VOICE, minimum_digits: 1, maximum_digits: 1, maximum_tries: 1, timeout_millis: 7000,
          client_state: this.provider.state(c.id, 'accept') }, 'private-summary');
      }
    } else if (e.event_type === 'call.speak.ended' && inbound && phase?.id === c.id) {
      if (phase.phase === 'greeting' && c.state === 'screening') {
        const expiry = s.now() + 60_000;
        if (!s.config.LIVE_BRIDGE_URL) return this.stop(c);
        await this.command(sid, 'streaming_start', { stream_url: `${s.config.LIVE_BRIDGE_URL.replace('https:', 'wss:')}/media/${c.id}/${expiry}/${streamTicket(s.config, c.id, expiry)}`,
          stream_track: 'inbound_track', stream_codec: 'PCMU', stream_bidirectional_codec: 'PCMU', stream_bidirectional_mode: 'rtp', stream_bidirectional_sampling_rate: 8000 }, 'stream');
      } else if (phase.phase === 'offer' && c.state === 'offering') {
        const permitted = await this.f.transition(c.id, (current, control, person) => current.state === 'offering' && control.activeCallId === current.id
          && screeningOpen(control, person, s.now()) && person.status === 'setup' ? { state: 'offering' } : undefined);
        if (!permitted) return this.stop(c);
        const ends = this.f.callEndpoints(c); if (!ends) return this.stop(c);
        try {
          const result = await this.command(sid, 'dial', { connection_id: s.config.TELNYX_SHARED_APPLICATION_ID, from: ends.shieldNumber, to: ends.phone,
            client_state: this.provider.state(c.id, 'recipient'), timeout_secs: 20, time_limit_secs: 300 }, 'recipient');
          if (validControlId(result?.call_control_id)) await this.f.bindChild(c.id, result.call_control_id, c.parentSid);
        } catch {
          // An uncertain Dial is never repeated. Any late child is refused; the caller can still leave a message.
          const next = await this.f.transition(c.id, current => current.state === 'offering' ? { state: 'voicemail', outcome: 'voicemail', reason: 'offer_unavailable',
            events: [...current.events, { kind: 'voicemail_offered', at: s.now() }] } : undefined);
          if (next) await this.voicemail(next);
        }
      } else if (phase.phase === 'voicemail' && c.state === 'voicemail' && !c.acceptedAt) {
        await this.deadline(c, 65);
        if (!c.captureFromAnswer) await this.command(sid, 'record_start', { format: 'mp3', channels: 'single', recording_track: 'inbound', max_length: 60, timeout_secs: 0,
          play_beep: true, transcription: false }, 'voicemail-recording');
      }
    } else if (e.event_type === 'call.gather.ended' && !inbound && phase?.id === c.id && phase.phase === 'accept') {
      const accepted = await this.f.accept(c.id, sid, p.digits ?? ''); if (!accepted) return;
      if (!accepted.acceptedAt) { await this.hangup(sid).catch(() => undefined); return this.voicemail(accepted); }
      // No connected audio can enter a saved message. Failure to stop recording fails closed.
      if (c.captureFromAnswer) await this.command(c.parentSid, 'record_stop', {}, 'stop-capture-before-connect');
      // Only the immutable recipient's bound leg pressing 1 can reach the bridge command.
      if (accepted.monitoringStartedAt) await this.command(c.parentSid, 'transcription_start', { transcription_engine: s.config.MONITOR_TRANSCRIPTION_ENGINE,
        ...(s.config.MONITOR_TRANSCRIPTION_ENGINE === 'Soniox' ? { transcription_engine_config: { transcription_engine: 'Soniox', transcription_model: 'soniox/stt-rt-v4' } } : {}), transcription_tracks: 'both' }, 'monitor');
      await this.deadline(c, 300);
      await this.command(sid, 'bridge', { call_control_id: c.parentSid, prevent_double_bridge: true, park_after_unbridge: 'self' }, 'accepted-bridge');
    } else if (e.event_type === 'call.dtmf.received' && inbound && p.digit === '#' && c.state === 'voicemail') {
      await this.command(sid, 'record_stop', {}, 'stop-voicemail');
      await this.hangup(sid);
    } else if (e.event_type === 'call.transcription' && inbound && c.acceptedAt) {
      const t = p.transcription_data;
      if (t?.is_final && t.transcript) await new CallMonitor(this.f).transcript(c.id, c.parentSid, t.transcript, t.transcription_track);
    }
  }
  /** Scheduled fallback survives crashed API/bridge instances and missing terminal webhooks. */
  async sweep() {
    const docs = await this.store.db.collection('callControlDeadlines').where('dueAt', '<=', this.store.now()).limit(30).get();
    const results = await Promise.allSettled(docs.docs.map(d => this.exclusive(d.id, async () => {
      const current = (await d.ref.get()).data(); if (!current || current.dueAt > this.store.now()) return;
      const c = await this.call(d.id); if (c) await this.stop(c);
      await d.ref.delete();
    })));
    if (results.some(r => r.status === 'rejected')) throw new Error('shared_cleanup_incomplete');
  }
}
export async function registerCallControl(app: FastifyInstance, store: CloudStore, provider?: CallControlProvider) {
  const cc = new SharedCallControl(store, provider);
  app.post('/voice/shared', async (request, reply) => {
    if (!store.config.SHARED_NUMBER_ENABLED || !store.config.TELNYX_SHARED_APPLICATION_ID) return reply.code(503).send({ ready: false });
    if (!verifyTelnyx(store.config.TELNYX_PUBLIC_KEY, request.headers['telnyx-signature-ed25519'], request.headers['telnyx-timestamp'], request.rawFormBody, store.now())) return reply.code(403).send({});
    const event = eventSchema.parse(request.body).data;
    if (event.payload.connection_id !== store.config.TELNYX_SHARED_APPLICATION_ID) return reply.code(403).send({});
    await cc.handle(event); return { received: true };
  });
}
