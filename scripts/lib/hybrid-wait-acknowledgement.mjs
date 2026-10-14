// Local prototype playback only. Never sends the acknowledgement to either model.
import { WaitAcknowledgement } from '../../dist/live/acknowledgement.js';
import { audiblePCMU } from '../../dist/live/session.js';

export class HybridWaitAcknowledgement {
  constructor(audio, observe) { this.ack = new WaitAcknowledgement(audio, observe); }
  startWaiting(now) { this.waitingSince ??= now; }
  frame(now, caller, liveAudio, terminal = false) {
    const speaking = liveAudio !== undefined && audiblePCMU(liveAudio);
    if (audiblePCMU(caller)) this.callerLastAt = now;
    if (speaking) { this.assistantLastAt = now; this.liveHasSpoken = true; }
    const acknowledgement = this.ack.frame(now, {
      waitingSince: terminal || this.liveHasSpoken ? undefined : this.waitingSince,
      callerLastAt: this.callerLastAt, assistantLastAt: this.assistantLastAt ?? 0,
      modelSpeaking: speaking
    });
    if (terminal) return;
    if (acknowledgement) return { audio: acknowledgement, source: 'acknowledgement' };
    if (liveAudio) return { audio: liveAudio, source: 'live' };
  }
}
