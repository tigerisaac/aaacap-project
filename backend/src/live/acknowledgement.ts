/** Local playback only. No prompt, model input, screening timers or verdict changes. */
export class WaitAcknowledgement {
  private used = false;
  private position?: number;
  constructor(private readonly audio: Buffer, private readonly observe: (phase: 'acknowledgement_started' | 'acknowledgement_finished' | 'acknowledgement_interrupted') => void = () => {}) {}
  frame(now: number, state: { waitingSince?: number; callerLastAt?: number; assistantLastAt: number; modelSpeaking: boolean }): Buffer | undefined {
    const quiet = state.callerLastAt !== undefined && now - state.callerLastAt >= 1000
      && (state.assistantLastAt === 0 || now - state.assistantLastAt >= 1000);
    if (this.position !== undefined && (!quiet || state.modelSpeaking || state.waitingSince === undefined)) {
      this.position = undefined; this.observe('acknowledgement_interrupted'); return;
    }
    if (!this.used && quiet && !state.modelSpeaking && state.waitingSince !== undefined && now - state.waitingSince >= 1000) {
      this.used = true; this.position = 0; this.observe('acknowledgement_started');
    }
    if (this.position === undefined) return;
    const frame = Buffer.alloc(160, 255);
    this.audio.copy(frame, 0, this.position, this.position + 160); this.position += 160;
    if (this.position >= this.audio.length) { this.position = undefined; this.observe('acknowledgement_finished'); }
    return frame;
  }
}
