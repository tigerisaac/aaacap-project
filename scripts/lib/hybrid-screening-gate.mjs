// Prototype only. Production does not import this module.
// The gate schedules the unchanged policy; it never classifies by keywords.
export class HybridScreeningGate {
  constructor({ assess, apply, fail, now = Date.now, intervalMs = 2500, maximumChecks = 8 }) {
    Object.assign(this, { assess, apply, fail, now, intervalMs, maximumChecks });
    this.text = ''; this.provisional = ''; this.revision = 0;
    this.lastCheckedText = ''; this.lastCheckAt = -Infinity; this.checks = 0;
    this.busy = false; this.closed = false; this.endpoint = false; this.pending = undefined;
    this.lastSpeechAt = -Infinity;
  }
  speech() { this.lastSpeechAt = this.now(); }
  update(text, provisional = '', endpoint = false) {
    if (text !== this.text || provisional !== this.provisional) this.revision++;
    this.text = text; this.provisional = provisional; this.endpoint = endpoint;
  }
  close() { this.closed = true; }
  tick() {
    if (this.closed || this.busy) return;
    if (this.pending) {
      if (this.pending.revision !== this.revision) { this.pending = undefined; this.lastCheckedText = ''; }
      else if (!this.provisional.trim() && (this.pending.decision.action === 'block'
        && this.pending.decision.reason === 'scam' || this.now() - this.lastSpeechAt >=
        (this.pending.decision.action === 'message' ? 8000 : 800))) {
        this.closed = true; this.apply(this.pending.decision, this.text); return;
      } else return;
    }
    const newText = this.text.length - this.lastCheckedText.length;
    if (!this.text.trim() || this.text === this.lastCheckedText || (!this.endpoint && newText < 24)
      || this.now() - this.lastCheckAt < this.intervalMs) return;
    if (this.checks >= this.maximumChecks) { this.closed = true; this.fail('screening_timeout'); return; }
    this.busy = true; this.checks++; this.lastCheckAt = this.now(); this.lastCheckedText = this.text;
    const revision = this.revision, transcript = this.text;
    Promise.resolve().then(() => this.assess(transcript)).then(decision => {
      if (this.closed) return;
      // A response based on superseded audio/text cannot trigger a handoff or hangup.
      if (revision === this.revision) this.pending = { decision, revision };
      else this.lastCheckedText = ''; // Reassess after a provisional-only correction too.
    }).catch(() => {
      if (!this.closed) { this.closed = true; this.fail('screening_unavailable'); }
    }).finally(() => { this.busy = false; });
  }
}

export function handoffInput(transcript, decision) {
  return [
    { type: 'message', role: 'user', content: [{ type: 'input_text', text: transcript }] },
    { type: 'message', role: 'developer', content: [{ type: 'input_text', text: JSON.stringify({
      handoff: 'The application has already assessed the caller with the configured screening policy.',
      decision: { action: decision.action, hasName: decision.hasName, hasReason: decision.hasReason },
      clarificationAlreadySpoken: false,
      nextStep: 'Continue the existing conversation with one brief question about the missing information. The opening greeting has already played.'
    }) }] }
  ];
}
