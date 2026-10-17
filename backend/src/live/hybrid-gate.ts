import { LIVE_LIMITS, type LiveDecision, type StopReason } from './policy.js';

/** One in-flight decision. Text revisions and unfinished ASR both prevent stale routing. */
export class HybridScreeningGate {
  private text = ''; private provisional = ''; private revision = 0;
  private checked = ''; private checkAt = -Infinity; private lastTextAt = -Infinity;
  private speechAt = -Infinity; private firstSpeechAt?: number;
  private endpoint = false; private finalized = false; private closed = false; private busy = false;
  private pending?: { decision: LiveDecision; revision: number };
  checks = 0;
  constructor(private readonly io: { assess(text: string): Promise<LiveDecision>; apply(d: LiveDecision, text: string): void;
    fail(reason: StopReason): void }, private readonly now: () => number = Date.now) {}
  get waiting() { return this.busy || !!this.pending; }
  speech() { this.speechAt = this.now(); this.firstSpeechAt ??= this.speechAt; this.finalized = false; }
  update(text: string, provisional: string, endpoint: boolean, finalized: boolean) {
    if (text !== this.text || provisional !== this.provisional) { this.revision++; this.lastTextAt = this.now(); }
    Object.assign(this, { text, provisional, endpoint, finalized });
  }
  close() { this.closed = true; this.pending = undefined; }
  tick() {
    if (this.closed || this.busy) return;
    if (this.pending) {
      if (this.pending.revision !== this.revision) { this.pending = undefined; this.checked = ''; }
      else if (this.finalized && !this.provisional.trim() && (this.pending.decision.action === 'block'
        && this.pending.decision.reason === 'scam' || this.now() - this.speechAt >=
        (this.pending.decision.action === 'message' ? LIVE_LIMITS.idleMs : LIVE_LIMITS.speechPauseMs))) {
        this.closed = true; this.io.apply(this.pending.decision, this.text); return;
      } else return;
    }
    const periodicAt = Number.isFinite(this.checkAt) ? this.checkAt : (this.firstSpeechAt ?? this.now());
    if (this.provisional.trim() || (!this.endpoint && this.now() - this.speechAt < 600
      && this.now() - periodicAt < 6000) || (!this.endpoint && this.now() - this.lastTextAt < 300)) return;
    // The recognizer's endpoint marker is transient. A short, finished turn still
    // needs a question/decision after a pause, even if a later progress event cleared it.
    if (!this.text.trim() || this.text === this.checked || (!this.endpoint && this.text.length - this.checked.length < 24
      && this.now() - this.speechAt < LIVE_LIMITS.speechPauseMs)
      || this.now() - this.checkAt < 2500) return;
    if (this.checks >= 8) { this.closed = true; this.io.fail('screening_timeout'); return; }
    this.busy = true; this.checks++; this.checkAt = this.now(); this.checked = this.text;
    const revision = this.revision, text = this.text;
    void Promise.resolve().then(() => this.io.assess(text)).then(decision => {
      if (this.closed) return;
      if (revision === this.revision) this.pending = { decision, revision };
      else this.checked = '';
    }).catch(() => { if (!this.closed) { this.closed = true; this.io.fail('screening_unavailable'); } })
      .finally(() => { this.busy = false; });
  }
}
