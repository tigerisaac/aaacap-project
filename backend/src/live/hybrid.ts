import { WebSocket } from 'ws';
import { ScreeningSession, audiblePCMU, type ScreeningIO } from './session.js';
import { LIVE_LIMITS, liveSessionConfig, type LiveDecision, type ScreeningContext, type StopReason } from './policy.js';
import { WaitAcknowledgement } from './acknowledgement.js';
import { HybridScreeningGate } from './hybrid-gate.js';
import { handoffInput, initialAssessment } from './hybrid-policy.js';
import { researchScamPattern, type ResearchResult, type ResearchTopic } from './research.js';
import { responseUsage, type TimingPhase, type TimingMetrics } from './timing.js';

export const HYBRID_SCREENING_VERSION = 'soniox-luna-live-v1';
type Kind = 'soniox' | 'live';
type Dependencies = { now?: () => number; fetch?: typeof fetch; socket?: (kind: Kind, key: string) => WebSocket };
type HybridIO = Omit<ScreeningIO, 'openai' | 'research'> & {
  /** Optional local synthetic recorder. Production never installs this observer. */
  transcript?(speaker: 'caller' | 'shield', delta: string): void;
};
const socket = (kind: Kind, key: string) => new WebSocket(kind === 'soniox'
  ? 'wss://stt-rt.soniox.com/transcribe-websocket' : 'wss://api.openai.com/v1/live/sessions', {
  headers: { Authorization: `Bearer ${key}` }, handshakeTimeout: 5000, maxPayload: 1_000_000,
  perMessageDeflate: false, followRedirects: false
});

/** One bounded call. The caller's number and telephony operations are deliberately absent. */
export class HybridScreeningSession {
  private readonly now: () => number; private readonly fetcher: typeof fetch; private readonly connect: typeof socket;
  private readonly startedAt: number; private readonly abort = new AbortController();
  private readonly gate: HybridScreeningGate; private readonly ack?: WaitAcknowledgement;
  private terminal = false; private started = false; private phase: 'triage' | 'handoff' | 'live' = 'triage';
  private stt?: WebSocket; private voice?: WebSocket; private live?: ScreeningSession;
  private sttReadyAt?: number; private sttOpen = false; private listeningAt?: number; private sttClosing = false; private handoffAt?: number;
  private sttQueue: Buffer[] = []; private sttQueuedBytes = 0;
  private tail: { start: number; audio: Buffer }[] = []; private tailBytes = 0;
  private liveQueue: Buffer[] = []; private liveQueuedBytes = 0; private liveChunk = 1;
  private audioMs = 0; private processedMs = 0; private finalizedMs = 0; private lastSoundMs = 0; private progressAt: number;
  private text = ''; private provisional = ''; private endpoint = false;
  private callerLastAt?: number; private assistantLastAt = 0; private liveSpoken = false;
  private waitingSince?: number; private liveFrame?: Buffer;
  private expectedChunk = 1; private pending = new Map<number, string>(); private gapAt?: number;
  private researchUsed = false; private toolCount = 0; private liveTools = new Set<string>();

  constructor(private readonly io: HybridIO, private readonly keys: { openai: string; soniox: string },
    private readonly context: ScreeningContext = {}, deps: Dependencies = {}) {
    this.now = deps.now ?? Date.now; this.fetcher = deps.fetch ?? fetch; this.connect = deps.socket ?? socket;
    this.startedAt = this.progressAt = this.now();
    this.ack = io.acknowledgementAudio ? new WaitAcknowledgement(io.acknowledgementAudio, phase => this.timing(phase)) : undefined;
    this.gate = new HybridScreeningGate({ assess: text => this.assess(text), apply: (d, text) => {
      if (d.action === 'continue') this.handoff(d, text); else void this.finish(d);
    }, fail: reason => { void this.stop(reason); } }, this.now);
  }
  get ended() { return this.terminal; }
  listen() { if (!this.terminal) this.listeningAt ??= this.now(); }
  private timing(phase: TimingPhase, metrics: TimingMetrics = {}) {
    try { this.io.timing?.(phase, { sessionMs: this.now() - this.startedAt, ...metrics }); } catch { /* Never affect routing. */ }
  }
  start() {
    if (this.started || this.terminal) return; this.started = true;
    this.timing('hybrid_stt_started');
    try {
      this.stt = this.connect('soniox', this.keys.soniox);
      this.stt.on('open', () => {
        if (this.terminal) { this.stt?.terminate(); return; }
        this.send(this.stt, JSON.stringify({ model: 'stt-rt-v5', audio_format: 'mulaw', sample_rate: 8000,
          num_channels: 1, language_hints: ['en'], enable_endpoint_detection: true, max_endpoint_delay_ms: 1500 }));
        this.sttOpen = true;
        // Legacy TeXML has already played its greeting. Shared calls require a
        // successful processing response: an open socket alone can still reject authentication.
        if (!this.io.waitForGreeting) { this.sttReadyAt = this.now(); this.listen(); this.timing('hybrid_stt_ready'); }
        for (const frame of this.sttQueue) this.send(this.stt, frame);
        this.sttQueue = []; this.sttQueuedBytes = 0;
      });
      this.stt.on('message', raw => { if (!this.sttClosing && !this.terminal) {
        try { this.sonioxEvent(JSON.parse(raw.toString())); } catch { void this.stop('screening_unavailable'); }
      } });
      this.stt.on('error', () => { if (!this.sttClosing) void this.stop('screening_unavailable'); });
      this.stt.on('close', () => { if (!this.sttClosing) void this.stop('screening_unavailable'); });
    } catch { void this.stop('screening_unavailable'); }
  }
  private send(ws: WebSocket | undefined, data: string | Buffer) {
    if (this.terminal) return;
    if (ws?.readyState !== WebSocket.OPEN || ws.bufferedAmount > 100_000) { void this.stop('screening_unavailable'); return; }
    try { ws.send(data); } catch { void this.stop('screening_unavailable'); }
  }
  private closeSTT() {
    if (this.sttClosing) return; this.sttClosing = true;
    const ws = this.stt; if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(''); } catch { /* Bounded termination below. */ }
      const timer = setTimeout(() => ws.terminate(), 1000); timer.unref();
    } else ws.terminate();
  }
  private cleanup() {
    this.abort.abort(); this.gate.close(); this.closeSTT(); this.pending.clear();
    this.sttQueue = []; this.tail = []; this.liveQueue = [];
    if (this.voice?.readyState === WebSocket.OPEN) {
      try { this.voice.send(JSON.stringify({ type: 'session.close' })); } catch { /* Bounded termination below. */ }
    }
    const ws = this.voice; if (ws) { const timer = setTimeout(() => ws.terminate(), 1500); timer.unref(); }
    this.io.telnyx({ event: 'clear' });
  }
  async stop(reason: StopReason) { await this.finish(reason); }
  private async finish(value: LiveDecision | StopReason) {
    if (this.terminal) return;
    // Never act on a voice decision that preceded delivery of buffered caller audio.
    if (typeof value !== 'string' && this.liveQueuedBytes) value = 'screening_unavailable';
    // A caller who already left words but cannot answer a clarification gets voicemail.
    if (value === 'silent_caller' && this.text.trim()) value = 'screening_timeout';
    this.terminal = true; this.timing('terminal_decision'); this.cleanup();
    if (this.live && !this.live.ended) this.live.providerEnded();
    try { await this.io.finish(value); }
    catch { this.timing('handoff_failed'); /* Carrier failure callbacks and durable deadlines recover this call. */ }
    finally { this.io.close(); }
  }
  providerEnded() {
    if (this.terminal) return;
    this.terminal = true; this.timing('provider_ended'); this.cleanup(); this.live?.providerEnded(); this.io.close();
  }
  input(chunk: number, payload: string) {
    if (this.terminal || !Number.isSafeInteger(chunk) || chunk < 1 || chunk < this.expectedChunk || this.pending.has(chunk)) return;
    if (typeof payload !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length > 5500
      || chunk - this.expectedChunk > 50 || this.pending.size >= 50) { void this.stop('screening_unavailable'); return; }
    this.pending.set(chunk, payload); this.flush();
    if (this.pending.size && this.gapAt === undefined) this.gapAt = this.now();
  }
  private flush() {
    while (this.pending.has(this.expectedChunk) && !this.terminal) {
      const payload = this.pending.get(this.expectedChunk)!; this.pending.delete(this.expectedChunk++);
      this.audio(Buffer.from(payload, 'base64'));
    }
    if (!this.pending.size) this.gapAt = undefined;
  }
  private audio(frame: Buffer) {
    const start = this.audioMs; this.audioMs += frame.length / 8;
    if (!frame.length || this.audioMs > LIVE_LIMITS.maximumMs + 1000) { void this.stop('screening_unavailable'); return; }
    if (audiblePCMU(frame)) { this.callerLastAt = this.now(); this.lastSoundMs = this.audioMs; this.gate.speech(); }
    if (this.phase === 'triage') {
      this.tail.push({ start, audio: frame }); this.tailBytes += frame.length;
      if (this.tailBytes > LIVE_LIMITS.maximumMs * 8) { void this.stop('screening_unavailable'); return; }
      if (this.sttOpen) this.send(this.stt, frame);
      else { this.sttQueue.push(frame); this.sttQueuedBytes += frame.length;
        if (this.sttQueuedBytes > 80_000) void this.stop('screening_unavailable'); }
    } else {
      this.liveQueue.push(frame); this.liveQueuedBytes += frame.length;
      if (this.liveQueuedBytes > 80_000) void this.stop('screening_unavailable');
    }
  }
  private sonioxEvent(e: any) {
    if (e.error_code || e.finished || !Array.isArray(e.tokens) || e.tokens.length > 5000
      || !Number.isFinite(e.final_audio_proc_ms) || e.final_audio_proc_ms < this.finalizedMs
      || e.final_audio_proc_ms > this.audioMs + 100) throw new Error('invalid_stt_event');
    // Long utterances can remain provisional while recognition is healthy.
    const processed = e.total_audio_proc_ms ?? e.final_audio_proc_ms;
    if (!Number.isFinite(processed) || processed < this.processedMs || processed < e.final_audio_proc_ms
      || processed > this.audioMs + 100) throw new Error('invalid_stt_progress');
    if (processed > this.processedMs) this.progressAt = this.now();
    this.processedMs = processed;
    this.finalizedMs = Math.min(this.audioMs, e.final_audio_proc_ms);
    if (e.tokens.some((t: any) => typeof t.text !== 'string' || typeof t.is_final !== 'boolean')) throw new Error('invalid_stt_tokens');
    if (this.sttReadyAt === undefined && processed > 0) {
      this.sttReadyAt = this.now(); this.timing('hybrid_stt_ready'); this.io.ready?.();
    }
    const words = e.tokens.filter((t: any) => !/^<.*>$/.test(t.text));
    const delta = words.filter((t: any) => t.is_final).map((t: any) => t.text).join('');
    this.text += delta;
    if (delta) { this.io.transcript?.('caller', delta); this.timing('hybrid_transcript'); }
    if (e.tokens.length) this.provisional = words.filter((t: any) => !t.is_final).map((t: any) => t.text).join('');
    if (this.text.length + this.provisional.length > LIVE_LIMITS.maxTranscript) { void this.stop('screening_timeout'); return; }
    this.endpoint = e.tokens.some((t: any) => t.is_final && t.text === '<end>');
    while (this.tail[0] && this.tail[0].start + this.tail[0].audio.length / 8 <= this.finalizedMs) {
      this.tailBytes -= this.tail.shift()!.audio.length;
    }
    this.gate.update(this.text, this.provisional, this.endpoint, this.finalizedMs >= this.lastSoundMs);
  }
  private async research(topic: ResearchTopic): Promise<ResearchResult> {
    if (this.researchUsed || this.terminal) return { status: 'unavailable' };
    this.researchUsed = true;
    return researchScamPattern(topic, this.keys.openai, (url, init) => this.fetcher(url, {
      ...init, signal: AbortSignal.any([this.abort.signal, ...(init?.signal ? [init.signal] : [])])
    }));
  }
  private async assess(transcript: string) {
    this.waitingSince ??= this.now(); this.timing('hybrid_check_started', { hybridChecks: this.gate.checks });
    return initialAssessment({ transcript, research: topic => this.research(topic),
      rejected: () => this.timing('hybrid_check_rejected'), respond: async input => {
        if (this.terminal) throw new Error('call_ended');
        const delegation = liveSessionConfig(this.context).delegation;
        if (delegation?.type !== 'responses') throw new Error('invalid_delegation');
        const request = delegation.responses;
        const response = await this.fetcher('https://api.openai.com/v1/responses', { method: 'POST', redirect: 'error',
          signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(LIVE_LIMITS.backendMs)]),
          headers: { Authorization: `Bearer ${this.keys.openai}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...request, service_tier: 'priority', tool_choice: 'required', store: false, input }) });
        if (!response.ok) throw new Error('initial_provider_failure');
        const body = await response.json(); this.timing('response_usage', { ...responseUsage(body), initialAssessment: true });
        this.toolCount += Array.isArray(body.output) ? body.output.filter((i: any) => i.type === 'function_call').length : 0;
        if (this.toolCount > LIVE_LIMITS.maxToolCalls) throw new Error('tool_limit');
        return body;
      } });
  }
  private handoff(decision: LiveDecision, transcript: string) {
    if (this.terminal) return;
    this.phase = 'handoff'; this.handoffAt = this.now(); this.timing('hybrid_handoff'); this.closeSTT();
    // Text represents only finalized audio. Replay everything after that boundary,
    // including speech arriving while the Live socket/session is being established.
    for (const item of this.tail) {
      const offset = Math.max(0, Math.floor((this.finalizedMs - item.start) * 8));
      const audio = item.audio.subarray(offset); if (audio.length) { this.liveQueue.push(audio); this.liveQueuedBytes += audio.length; }
    }
    this.tail = []; this.tailBytes = 0;
    this.live = new ScreeningSession({
      openai: event => {
        if (event.type === 'session.start') event = { ...event, session: { ...event.session,
          input: handoffInput(transcript, decision), delegation: { ...event.session.delegation,
            responses: { ...event.session.delegation.responses, service_tier: 'priority' } } } };
        this.send(this.voice, JSON.stringify(event));
      },
      telnyx: event => {
        if (event.event === 'media') this.liveFrame = Buffer.from(event.media.payload, 'base64');
        else this.io.telnyx(event);
      }, research: topic => this.research(topic), finish: d => this.finish(d),
      close: () => { if (!this.terminal) void this.stop('screening_unavailable'); },
      timing: this.io.timing
    }, this.now, this.context);
    this.live.resumeClarification(`${transcript} `, decision);
    try {
      this.voice = this.connect('live', this.keys.openai);
      this.voice.on('open', () => { if (!this.terminal) { this.timing('model_socket_open'); this.live!.start(); } else this.voice?.terminate(); });
      this.voice.on('message', raw => {
        try {
          const event = JSON.parse(raw.toString());
          if (this.terminal) { this.live?.event(event); if (event.type === 'session.closed') this.voice?.close(); return; }
          if (event.type === 'session.started') this.phase = 'live';
          if (event.type === 'session.input_transcript.delta' && typeof event.delta === 'string') this.io.transcript?.('caller', event.delta);
          if (event.type === 'session.output_transcript.delta' && typeof event.delta === 'string') this.io.transcript?.('shield', event.delta);
          const call = event.type === 'response.event' && event.event?.type === 'response.output_item.done' ? event.event.item : undefined;
          if (call?.type === 'function_call' && typeof call.call_id === 'string' && !this.liveTools.has(call.call_id)) {
            this.liveTools.add(call.call_id); if (++this.toolCount > LIVE_LIMITS.maxToolCalls) { void this.stop('screening_timeout'); return; }
          }
          this.live?.event(event);
        } catch { void this.stop('screening_unavailable'); }
      });
      this.voice.on('error', () => { void this.stop('screening_unavailable'); });
      this.voice.on('close', () => { if (!this.terminal) void this.stop('screening_unavailable'); });
    } catch { void this.stop('screening_unavailable'); }
  }
  tick() {
    if (this.terminal) return;
    const now = this.now();
    if (now - this.startedAt >= LIVE_LIMITS.maximumMs) { void this.stop('screening_timeout'); return; }
    if (this.gapAt !== undefined && now - this.gapAt >= 100) {
      const next = Math.min(...this.pending.keys());
      for (; this.expectedChunk < next; this.expectedChunk++) this.audio(Buffer.alloc(160, 255));
      this.gapAt = undefined; this.flush();
    }
    if (this.phase === 'triage') {
      if (this.sttReadyAt === undefined && now - this.startedAt >= LIVE_LIMITS.startupMs) { void this.stop('screening_unavailable'); return; }
      if (this.io.waitForGreeting && this.listeningAt === undefined) return;
      if (this.listeningAt !== undefined && this.callerLastAt === undefined && now - this.listeningAt >= LIVE_LIMITS.initialSilenceMs) { void this.stop('silent_caller'); return; }
      if (this.callerLastAt !== undefined && this.finalizedMs < this.lastSoundMs && now - this.progressAt >= LIVE_LIMITS.idleMs) { void this.stop('screening_unavailable'); return; }
      this.gate.tick();
      if (!this.gate.waiting && this.callerLastAt !== undefined && now - this.callerLastAt >= LIVE_LIMITS.idleMs && !this.text.trim()) {
        void this.stop('screening_unavailable'); return;
      }
    } else if (this.phase === 'handoff' && now - this.handoffAt! >= LIVE_LIMITS.startupMs) { void this.stop('screening_unavailable'); return; }
    this.liveFrame = undefined;
    if (this.phase === 'live') {
      // Drain brief connection jitter faster than realtime, with bounded buffers.
      for (let n = 0; n < 10 && this.liveQueue.length && !this.terminal; n++) {
        const frame = this.liveQueue.shift()!; this.liveQueuedBytes -= frame.length;
        this.live!.input(this.liveChunk++, frame.toString('base64'));
      }
      this.live!.tick();
    }
    if (this.terminal) return;
    const speaking = this.liveFrame !== undefined && audiblePCMU(this.liveFrame);
    if (speaking) { this.assistantLastAt = now; this.liveSpoken = true; }
    const ack = this.ack?.frame(now, { waitingSince: this.liveSpoken ? undefined : this.waitingSince,
      callerLastAt: this.callerLastAt, assistantLastAt: this.assistantLastAt, modelSpeaking: speaking });
    const playback = ack ?? this.liveFrame;
    if (playback) this.io.telnyx({ event: 'media', media: { payload: playback.toString('base64') } });
  }
}
