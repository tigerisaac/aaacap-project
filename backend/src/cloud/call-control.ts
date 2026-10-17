import { SharedProbes } from './shared-probes.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../auth.js';
import type { CloudStore } from './store.js';
import { CONNECTED_CALL_SECONDS, ForwardingStore, screeningOpen, type ForwardingCall } from './forwarding-store.js';
import { CallControlProvider, validControlId } from './call-control-provider.js';
import { callerNumber, validRecordingId, verifyTelnyx } from './forwarding-provider.js';
import { forwardingIdentity, normalizeForwardedNumber } from './shared-routing.js';
import { streamTicket } from './forwarding-live.js';
import { CallMonitor, warningText } from './monitoring.js';
import { purposes } from './copy.js';
import { MESSAGE_CAPTURE_SECONDS } from './message-audio.js';
import { ANNOUNCEMENT_BACKUP_VOICE, CAPTURE_GREETING, CAPTURE_VOICEMAIL, failedPlayback, rejectedAudioCommand, requiredAnnouncementAudio } from './announcements.js';
import { queueCallJob } from './call-jobs.js';
import { prepareBridge } from './bridge-startup.js';

const eventSchema = z.object({ data: z.object({ id: z.string().min(1).max(200), event_type: z.string().max(100),
  occurred_at: z.string().datetime({ offset: true }), payload: z.object({ call_control_id: z.string().refine(validControlId),
    call_leg_id: z.string().min(1).max(200), connection_id: z.string(), from: z.string().optional(), to: z.string().optional(),
    direction: z.string().optional(), client_state: z.string().max(400).nullable().optional(), sip_headers: z.unknown().optional(),
    digits: z.string().max(128).optional(), digit: z.string().max(1).optional(), recording_id: z.string().optional(), recording_started_at: z.string().optional(), recording_ended_at: z.string().optional(),
    status: z.string().max(100).optional(),
    transcription_data: z.object({ is_final: z.boolean().optional(), transcript: z.string().max(8000).optional(), transcription_track: z.string().optional() }).optional()
  }) }) });
type Event = z.infer<typeof eventSchema>['data'];
const TTL = 2 * 3600_000;
/** Durable call state and command receipts survive webhook retries and multiple API/bridge instances. */
export class SharedCallControl {
  readonly f: ForwardingStore;
  constructor(readonly store: CloudStore, readonly provider = new CallControlProvider(store.config), readonly prepare = prepareBridge) { this.f = new ForwardingStore(store); }
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
      const dueAt = this.store.now() + seconds * 1000;
      tx.set(ref, { callId: c.id, phaseSeconds: seconds, dueAt, expiresAt: this.store.now() + TTL });
      queueCallJob(this.store, tx, c.id, 'deadline', dueAt);
    });
  }
  async stop(c: ForwardingCall) {
    await Promise.all([this.hangup(c.parentSid), ...(c.childSid ? [this.hangup(c.childSid)] : [])]);
    await this.f.ended(c.parentSid);
    await new CallMonitor(this.f).end(c.id);
  }
  prompt(c: ForwardingCall, phase: string): string {
    if (phase === 'greeting') return CAPTURE_GREETING;
    if (phase === 'voicemail') return c.captureFromAnswer ? CAPTURE_VOICEMAIL
      : 'You have reached Shield voicemail. Please leave a message after the tone. Press pound when finished.';
    if (phase === 'offer') return c.monitoringStartedAt
      ? 'Please hold while Shield offers your call. If it connects, an AI assistant will transcribe the call to help protect against fraud.'
      : 'Please hold while Shield offers your call.';
    if (phase === 'accept') return `Shield screened a call about ${purposes[c.purpose as keyof typeof purposes] ?? 'a routine matter'}. This does not verify who is calling. Press 1 to connect, or 2 for voicemail.`;
    if (phase === 'warning') return warningText(c.monitorConcern ?? '');
    throw new Error('announcement_phase_invalid');
  }
  /** One durable backup command; late primary callbacks cannot skip the replacement prompt. */
  async fallback(c: ForwardingCall, phase: string) {
    const payload = this.prompt(c, phase); requiredAnnouncementAudio(payload);
    if (!c.announcementFallbacks?.[phase]) {
      await this.store.callRef(c.id).update({ [`announcementFallbacks.${phase}`]: true });
      if (phase === 'warning') await this.deadline(c, 30);
    }
    const sid = ['accept', 'warning'].includes(phase) ? c.childSid : c.parentSid;
    if (!sid) return this.stop(c);
    return this.command(sid, phase === 'accept' ? 'gather_using_speak' : 'speak', {
      payload, voice: ANNOUNCEMENT_BACKUP_VOICE, client_state: this.provider.state(c.id, `${phase}-backup`),
      ...(phase === 'accept' ? { minimum_digits: 1, maximum_digits: 1, maximum_tries: 1, timeout_millis: 7000 } : {})
    }, `${phase}-backup`);
  }
  async play(c: ForwardingCall, phase: string) {
    if (c.announcementFallbacks?.[phase]) return this.fallback(c, phase);
    try {
      return await this.command(c.parentSid, 'playback_start', { audio_url: requiredAnnouncementAudio(this.prompt(c, phase)).url,
        audio_type: 'wav', cache_audio: true, client_state: this.provider.state(c.id, phase) }, phase);
    } catch (error) {
      // A network timeout may have played the audio already. Retry its original command, never switch blindly.
      if (rejectedAudioCommand(error)) return this.fallback(c, phase);
      throw error;
    }
  }
  async answer(c: ForwardingCall) {
    // This provider operation captures even speech overlapping the greeting/model startup.
    const current = await this.f.transition(c.id, (call, ctrl) => call.state !== 'ended' && !call.inboundEndedAt && ctrl.activeCallId === call.id
      ? { captureFromAnswer: true, answerRequestedAt: call.answerRequestedAt ?? this.store.now() } : undefined);
    if (!current) return;
    c = current;
    if (c.startupVersion) await this.deadline(c, c.state === 'screening' ? 25 : 80);
    const expiry = c.answerRequestedAt! + 60_000;
    const stream = c.startupVersion && c.state === 'screening' && this.store.config.LIVE_BRIDGE_URL ? {
      stream_url: `${this.store.config.LIVE_BRIDGE_URL.replace('https:', 'wss:')}/media/${c.id}/${expiry}/${streamTicket(this.store.config, c.id, expiry)}`,
      stream_track: 'inbound_track', stream_codec: 'PCMU', stream_bidirectional_codec: 'PCMU', stream_bidirectional_mode: 'rtp', stream_bidirectional_sampling_rate: 8000
    } : {};
    const result = await this.command(c.parentSid, 'answer', { client_state: this.provider.state(c.id, 'inbound'), send_silence_when_idle: true,
      ...stream,
      record: 'record-from-answer', record_channels: 'single', record_track: 'inbound', record_format: 'mp3',
      record_max_length: MESSAGE_CAPTURE_SECONDS, record_timeout_secs: 0 }, 'answer');
    // A durable job also covers a missing recording-saved webhook.
    if (validRecordingId(result?.recording_id ?? '')) await this.f.recording(c.parentSid, result.recording_id, 0);
  }
  async voicemail(c: ForwardingCall) {
    if (c.acceptedAt || c.inboundEndedAt || c.state !== 'voicemail' || c.voicemailPromptCompletedAt) return;
    await this.deadline(c, 80);
    await this.play(c, 'voicemail');
  }
  /** Called only after the actual media session has a healthy recognizer. */
  async screeningReady(id: string) {
    return this.f.transition(id, c => c.startupVersion && c.state === 'screening' && c.liveConnectedAt && !c.screeningReadyAt && !c.inboundEndedAt
      ? { screeningReadyAt: this.store.now() } : undefined,
    (tx, c) => queueCallJob(this.store, tx, c.id, 'greet'));
  }
  async start(id: string) {
    return this.exclusive(id, async () => {
      let c = await this.call(id);
      if (!c || !c.startupVersion || !['screening', 'voicemail'].includes(c.state) || c.inboundEndedAt || c.liveConnectedAt) return;
      // A delayed/redelivered job must never resurrect an abandoned ring or an uncertain old answer.
      if (this.store.now() - (c.answerRequestedAt ?? c.createdAt) > 45_000) return this.stop(c);
      if (!c.answerRequestedAt) await this.deadline(c, c.state === 'screening' ? 20 : 80);
      if (c.state === 'screening' && !c.answerRequestedAt) {
        try { await this.prepare(this.store.config, c.id, 12_000 - (this.store.now() - c.createdAt)); }
        catch {
          await this.f.transition(c.id, current => current.state === 'screening' && !current.liveConnectedAt && !current.inboundEndedAt
            ? { state: 'voicemail', outcome: 'voicemail', reason: 'screening_unavailable', liveFinishedAt: this.store.now() } : undefined,
          (tx, next) => queueCallJob(this.store, tx, next.id, 'outcome'));
        }
      }
      c = await this.call(id);
      if (!c || c.state === 'ended' || c.inboundEndedAt) return;
      await this.answer(c);
    });
  }
  async runJob(jobId: string) {
    const ref = this.store.db.collection('callControlJobs').doc(jobId), job = (await ref.get()).data();
    if (!job || job.done || job.expiresAt <= this.store.now()) return;
    if (job.dueAt > this.store.now()) throw new Error('call_job_not_due');
    if (job.phase === 'start') await this.start(job.callId);
    else if (job.phase === 'outcome') await this.outcome(job.callId);
    else if (job.phase === 'voicemail') await this.exclusive(job.callId, async () => {
      const c = await this.call(job.callId);
      if (c) await this.voicemail(c);
    });
    else if (job.phase === 'greet') await this.exclusive(job.callId, async () => {
      const c = await this.call(job.callId);
      if (!c || c.state !== 'screening' || c.inboundEndedAt || !c.screeningReadyAt || c.greetingCompletedAt) return;
      await this.play(c, 'greeting');
    });
    else if (job.phase === 'warning') await this.warning(job.callId);
    else if (job.phase === 'deadline') await this.expire(job.callId, job.dueAt);
    else throw new Error('invalid_call_job');
    await ref.update({ done: true });
  }
  /** Both signed, bound-leg receipts are required; callback arrival order does not matter. */
  async warningParked(id: string, field: 'monitorCallerEndedAt' | 'monitorRecipientParkedAt') {
    const s = this.store;
    await s.db.runTransaction(async tx => {
      const c = (await tx.get(s.callRef(id))).data() as ForwardingCall | undefined;
      if (!c || c.state !== 'accepted' || !c.monitorIntervenedAt || !c.monitorWarningWaitForPark || c.monitorWarningQueuedAt) return;
      const next = { ...c, [field]: c[field] ?? s.now() };
      const dueAt = next.monitorCallerEndedAt && next.monitorRecipientParkedAt
        ? Math.max(s.now(), next.monitorRecipientParkedAt + 750) : undefined;
      tx.update(s.callRef(id), { [field]: next[field], ...(dueAt ? { monitorWarningQueuedAt: dueAt } : {}) });
      if (dueAt) queueCallJob(s, tx, id, 'warning', dueAt);
    });
  }
  async warning(id: string) {
    return this.exclusive(id, async () => {
      const c = await this.call(id), now = this.store.now();
      if (!c || c.transport !== 'call-control' || c.state !== 'accepted' || !c.childSid || !c.monitorIntervenedAt ||
          !c.monitorWarningWaitForPark || !c.monitorCallerEndedAt || !c.monitorRecipientParkedAt || !c.monitorWarningQueuedAt ||
          now < c.monitorWarningQueuedAt || now >= c.monitorIntervenedAt + 30_000) return;
      if (c.announcementFallbacks?.warning) {
        await this.fallback(c, 'warning');
        await this.store.callRef(id).update({ monitorRedirectedAt: this.store.now() });
        return;
      }
      try {
        await this.command(c.childSid, 'playback_start', { audio_url: requiredAnnouncementAudio(warningText(c.monitorConcern ?? '')).url,
          audio_type: 'wav', cache_audio: true, client_state: this.provider.state(id, 'warning') }, 'warning');
      } catch (error) {
        if (!rejectedAudioCommand(error)) throw error;
        await this.fallback(c, 'warning');
      }
      await this.store.callRef(id).update({ monitorRedirectedAt: this.store.now() });
    });
  }
  async outcome(id: string) {
    return this.exclusive(id, async () => {
      let c = await this.call(id); if (!c || c.transport !== 'call-control' || c.inboundEndedAt || c.acceptedAt || c.state === 'accepting') return;
      await this.command(c.parentSid, 'streaming_stop', {}, 'stop-stream').catch(() => undefined);
      // The carrier can confirm hangup while the provider command is in flight.
      c = await this.call(id); if (!c || c.inboundEndedAt || c.acceptedAt || c.state === 'accepting') return;
      if (c.state === 'voicemail') return this.voicemail(c);
      if (c.state !== 'offering') return this.stop(c);
      await this.deadline(c, 45);
      await new CallMonitor(this.f).begin(c.id);
      // Finish the disclosure before placing the recipient call, so acceptance cannot race past it.
      await this.play((await this.call(c.id))!, 'offer');
    });
  }
  async handle(e: Event) {
    const s = this.store, p = e.payload, sid = p.call_control_id, state = this.provider.readState(p.client_state);
    let c = await this.f.find(sid);
    if (!c && state) c = await this.call(state.id);
    const lock = c?.id ?? sid;
    const receipt = s.db.collection('callControlEvents').doc(s.vault.hash(e.id));
    const boundInbound = c?.transport === 'call-control' && c.parentSid === sid && c.parentLegId === p.call_leg_id;
    if (boundInbound && e.event_type === 'call.hangup') {
      // Telnyx can exhaust all retries in less than a second. An executor lease
      // is not grounds to discard proof that this unconnected call has ended.
      const ended = await this.f.unconnectedHangup(c!.id, sid, p.call_leg_id);
      if (ended) {
        await new CallMonitor(this.f).end(ended.id);
        await receipt.set({ expiresAt: s.now() + TTL });
        return;
      }
    }
    // These receipts must survive contention with the hangup executor. They only
    // enqueue a durable job; no carrier command runs inside their transaction.
    if (c?.monitorWarningWaitForPark && c.monitorIntervenedAt && Date.parse(e.occurred_at) >= c.monitorIntervenedAt) {
      if (boundInbound && e.event_type === 'call.hangup') await this.warningParked(c.id, 'monitorCallerEndedAt');
      if (c.childSid === sid && e.event_type === 'call.hold') {
        await this.warningParked(c.id, 'monitorRecipientParkedAt');
        await receipt.set({ expiresAt: s.now() + TTL });
        return;
      }
    }
    const run = async () => {
      if ((await receipt.get()).exists) return;
      if (!await new SharedProbes(s, this.provider).handle(e.event_type, e.payload)) await this.process(e);
      await receipt.set({ expiresAt: s.now() + TTL });
    };
    // These operations use transactional state and idempotent command IDs. They
    // must survive a stuck executor: preserve captures and recover failed media.
    if (boundInbound && ['call.recording.saved', 'streaming.failed', 'streaming.stopped'].includes(e.event_type)) return run();
    // Warning playback can overlap the caller's hangup executor. These signed,
    // bound-leg receipts and idempotent terminal commands must not lose all carrier retries.
    const warningEvent = c?.transport === 'call-control' && c.childSid === sid && !!c.monitorIntervenedAt
      && state?.id === c.id && ['warning', 'warning-backup'].includes(state.phase)
      && ['call.playback.started', 'call.playback.ended', 'call.speak.started', 'call.speak.ended'].includes(e.event_type);
    if (warningEvent) return run();
    return this.exclusive(lock, run);
  }
  async process(e: Event) {
    const s = this.store, p = e.payload, sid = p.call_control_id, phase = this.provider.readState(p.client_state);
    let c = await this.f.find(sid);
    if (!c && phase) c = await this.call(phase.id);
    if (e.event_type === 'call.initiated' && p.direction === 'incoming') {
      if (c) {
        if (c.parentSid === sid && c.parentLegId === p.call_leg_id && c.state !== 'ended') {
          if (!(await s.db.collection('callControlDeadlines').doc(c.id).get()).exists) await this.deadline(c, c.startupVersion ? 20 : 90);
          if (!c.startupVersion) await this.answer(c);
        }
        return;
      }
      // A prior hangup tombstone prevents delayed initiation from resurrecting a call.
      if ((await s.keyRef(sid).get()).exists || s.now() - Date.parse(e.occurred_at) > 30_000) return;
      const diverted = forwardingIdentity(p.sip_headers), to = normalizeForwardedNumber(p.to ?? '');
      if (!diverted || to !== s.config.TELNYX_NUMBER || p.from === to) { await this.hangup(sid); return; }
      c = await this.f.begin(sid, to, callerNumber(p.from), { diverted, legId: p.call_leg_id });
      if (!c || c.state === 'ended') { await this.hangup(sid); return; }
      await this.deadline(c, c.startupVersion ? 20 : 90);
      if (!c.startupVersion) await this.answer(c);
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
      if (['call.answered', 'call.gather.ended', 'call.playback.ended', 'call.speak.ended'].includes(e.event_type)) throw new HttpError(503, 'call_not_bound');
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
    if (inbound && ['streaming.failed', 'streaming.stopped'].includes(e.event_type)) {
      const next = await this.f.transition(c.id, current => {
        if (current.state === 'voicemail' && current.reason === 'screening_unavailable') return {};
        if (current.state !== 'screening') return;
        return { state: 'voicemail', outcome: 'voicemail', reason: 'screening_unavailable',
          liveFinishedAt: s.now(), events: [...current.events, { kind: 'voicemail_offered', at: s.now() }] };
      }, (tx, next) => queueCallJob(s, tx, next.id, 'outcome'));
      if (next) {
        console.info(JSON.stringify({ event: 'shared_stream_recovery', callId: c.id }));
        await this.voicemail(next);
      }
      return;
    }
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
    const backup = phase?.phase.endsWith('-backup') ?? false;
    const promptPhase = backup ? phase!.phase.slice(0, -7) : phase?.phase;
    const promptEnded = (!backup && e.event_type === 'call.playback.ended') || (backup && e.event_type === 'call.speak.ended');
    const promptStarted = (!backup && e.event_type === 'call.playback.started') || (backup && e.event_type === 'call.speak.started');
    const currentVoice = !!promptPhase && (!!c.announcementFallbacks?.[promptPhase] === backup);
    if ((promptStarted || promptEnded) && !inbound && phase?.id === c.id && promptPhase === 'warning' && c.monitorIntervenedAt) {
      if (!currentVoice) return;
      const field = promptStarted ? 'monitorWarningStartedAt' : p.status === 'completed'
        ? 'monitorWarningCompletedAt' : 'monitorWarningInterruptedAt';
      await s.callRef(c.id).update({ [field]: Date.parse(e.occurred_at) });
      if (promptStarted || c.state === 'ended' || p.status === 'call_hangup') return;
      if (!backup && failedPlayback(p.status)) return this.fallback(c, 'warning');
      await this.hangup(sid);
      return;
    }
    if (c.state === 'ended') return;
    // Gather can cancel its audio when a key is pressed. Only actual media failures terminate it.
    if (e.event_type === 'call.playback.ended' && !inbound && c.state === 'accepting' && phase?.id === c.id && phase.phase === 'accept'
      && failedPlayback(p.status)) return this.fallback(c, 'accept');
    if (e.event_type === 'call.answered') {
      if (inbound) {
        if (c.state === 'voicemail') return this.voicemail(c);
        if (c.state === 'screening' && !c.startupVersion) await this.play(c, 'greeting');
      } else {
        const whisper = await this.f.whisper(c.id, sid, c.parentSid); if (!whisper) return;
        if (c.announcementFallbacks?.accept) return this.fallback(c, 'accept');
        try {
          await this.command(sid, 'gather_using_audio', { audio_url: requiredAnnouncementAudio(this.prompt(c, 'accept')).url,
            minimum_digits: 1, maximum_digits: 1, maximum_tries: 1, timeout_millis: 7000,
            client_state: this.provider.state(c.id, 'accept') }, 'private-summary');
        } catch (error) {
          if (rejectedAudioCommand(error)) return this.fallback(c, 'accept');
          throw error;
        }
      }
    } else if (promptEnded && inbound && phase?.id === c.id) {
      const currentPrompt = (promptPhase === 'greeting' && c.state === 'screening')
        || (promptPhase === 'offer' && c.state === 'offering') || (promptPhase === 'voicemail' && c.state === 'voicemail' && !c.acceptedAt);
      if (!currentPrompt) return;
      if (!backup && failedPlayback(p.status)) return this.fallback(c, promptPhase!);
      if (!currentVoice) return;
      // Completion, not command acceptance or cancellation, gates screening/dialing/recording.
      if (p.status !== 'completed') return this.stop(c);
      if (promptPhase === 'greeting' && c.state === 'screening') {
        if (c.startupVersion) {
          if (!c.screeningReadyAt) return;
          await this.f.transition(c.id, current => current.state === 'screening' && !current.greetingCompletedAt && current.screeningReadyAt
            ? { greetingCompletedAt: s.now() } : undefined);
          await this.deadline(c, 75);
          return;
        }
        const expiry = s.now() + 60_000;
        if (!s.config.LIVE_BRIDGE_URL) return this.stop(c);
        await this.command(sid, 'streaming_start', { stream_url: `${s.config.LIVE_BRIDGE_URL.replace('https:', 'wss:')}/media/${c.id}/${expiry}/${streamTicket(s.config, c.id, expiry)}`,
          stream_track: 'inbound_track', stream_codec: 'PCMU', stream_bidirectional_codec: 'PCMU', stream_bidirectional_mode: 'rtp', stream_bidirectional_sampling_rate: 8000 }, 'stream');
      } else if (promptPhase === 'offer' && c.state === 'offering') {
        const permitted = await this.f.transition(c.id, (current, control, person) => current.state === 'offering' && control.activeCallId === current.id
          && screeningOpen(control, person, s.now()) && person.status === 'setup' ? { state: 'offering' } : undefined);
        if (!permitted) return this.stop(c);
        const ends = this.f.callEndpoints(c); if (!ends) return this.stop(c);
        try {
          const result = await this.command(sid, 'dial', { connection_id: s.config.TELNYX_SHARED_APPLICATION_ID, from: ends.shieldNumber, to: ends.phone,
            client_state: this.provider.state(c.id, 'recipient'), timeout_secs: 20, time_limit_secs: CONNECTED_CALL_SECONDS }, 'recipient');
          if (validControlId(result?.call_control_id)) await this.f.bindChild(c.id, result.call_control_id, c.parentSid);
        } catch {
          // An uncertain Dial is never repeated. Any late child is refused; the caller can still leave a message.
          const next = await this.f.transition(c.id, current => current.state === 'offering' ? { state: 'voicemail', outcome: 'voicemail', reason: 'offer_unavailable',
            events: [...current.events, { kind: 'voicemail_offered', at: s.now() }] } : undefined);
          if (next) await this.voicemail(next);
        }
      } else if (promptPhase === 'voicemail' && c.state === 'voicemail' && !c.acceptedAt) {
        await this.f.transition(c.id, current => current.state === 'voicemail' && !current.inboundEndedAt && !current.voicemailPromptCompletedAt
          ? { voicemailPromptCompletedAt: s.now() } : undefined);
        await this.deadline(c, 65);
        if (!c.captureFromAnswer) await this.command(sid, 'record_start', { format: 'mp3', channels: 'single', recording_track: 'inbound', max_length: 60, timeout_secs: 0,
          play_beep: true, transcription: false }, 'voicemail-recording');
      }
    } else if (e.event_type === 'call.gather.ended' && !inbound && phase?.id === c.id && promptPhase === 'accept' && currentVoice) {
      if (['cancelled', 'cancelled_amd', 'call_hangup'].includes(p.status ?? '')) return;
      const accepted = await this.f.accept(c.id, sid, p.status && p.status !== 'valid' ? '' : p.digits ?? ''); if (!accepted) return;
      if (!accepted.acceptedAt) { await this.hangup(sid).catch(() => undefined); return this.voicemail(accepted); }
      // No connected audio can enter a saved message. Failure to stop recording fails closed.
      if (c.captureFromAnswer) await this.command(c.parentSid, 'record_stop', {}, 'stop-capture-before-connect');
      // Only the immutable recipient's bound leg pressing 1 can reach the bridge command.
      if (accepted.monitoringStartedAt) await this.command(c.parentSid, 'transcription_start', { transcription_engine: s.config.MONITOR_TRANSCRIPTION_ENGINE,
        ...(s.config.MONITOR_TRANSCRIPTION_ENGINE === 'Soniox' ? { transcription_engine_config: { transcription_engine: 'Soniox', transcription_model: 'soniox/stt-rt-v4' } } : {}), transcription_tracks: 'both' }, 'monitor');
      await this.deadline(c, CONNECTED_CALL_SECONDS);
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
  async expire(id: string, dueAt?: number) {
    await this.exclusive(id, async () => {
      const ref = this.store.db.collection('callControlDeadlines').doc(id), current = (await ref.get()).data();
      if (!current || current.dueAt > this.store.now() || (dueAt !== undefined && dueAt !== current.dueAt)) return;
      const c = await this.call(id);
      if (c && !c.inboundEndedAt) {
        if (c.startupVersion && c.state === 'screening' && !c.greetingCompletedAt && c.answerRequestedAt) {
          const next = await this.f.transition(id, call => call.state === 'screening' && !call.greetingCompletedAt
            ? { state: 'voicemail', outcome: 'voicemail', reason: 'screening_unavailable', liveFinishedAt: this.store.now() } : undefined,
          (tx, call) => queueCallJob(this.store, tx, call.id, 'outcome'));
          if (next) { await this.deadline(next, 80); return; }
        }
        await this.stop(c);
      }
      await ref.delete();
    });
  }
  async sweep() {
    const docs = await this.store.db.collection('callControlDeadlines').where('dueAt', '<=', this.store.now()).limit(30).get();
    const results = await Promise.allSettled(docs.docs.map(d => this.expire(d.id)));
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
