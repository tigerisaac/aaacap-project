import assert from 'node:assert/strict';
import { HybridWaitAcknowledgement } from './lib/hybrid-wait-acknowledgement.mjs';

const speech = Buffer.alloc(160, 10), silence = Buffer.alloc(160, 255), clip = Buffer.alloc(8800, 10);
for (const interruption of ['caller', 'live', 'terminal', 'none']) {
  const events = [], ack = new HybridWaitAcknowledgement(clip, type => events.push(type));
  assert.equal(ack.frame(0, speech), undefined);
  ack.startWaiting(100);
  assert.equal(ack.frame(1099, silence), undefined);
  assert.equal(ack.frame(1100, silence)?.source, 'acknowledgement');
  ack.startWaiting(1110); // Starting Live must not reset the one-shot acknowledgement.
  if (interruption === 'none') {
    for (let t = 1120; t < 2300; t += 20) ack.frame(t, silence);
    assert.deepEqual(events, ['acknowledgement_started', 'acknowledgement_finished']);
  } else {
    const playback = ack.frame(1120, interruption === 'caller' ? speech : silence,
      interruption === 'live' ? speech : undefined, interruption === 'terminal');
    assert.equal(playback?.source, interruption === 'live' ? 'live' : undefined);
    if (interruption === 'live') assert.equal(playback.audio, speech);
    assert.deepEqual(events, ['acknowledgement_started', 'acknowledgement_interrupted']);
  }
  assert.equal(ack.frame(5000, silence), undefined, 'never repeat across the handoff');
}
const fast = new HybridWaitAcknowledgement(clip);
fast.frame(0, speech); fast.startWaiting(100);
assert.equal(fast.frame(500, silence, speech)?.source, 'live');
assert.equal(fast.frame(3000, silence), undefined, 'no startup acknowledgement after Live has spoken');
const unheard = new HybridWaitAcknowledgement(clip);
unheard.startWaiting(0);
assert.equal(unheard.frame(2000, silence), undefined, 'do not speak before hearing the caller');
console.log('Hybrid acknowledgement checks passed: quiet delay, one-shot handoff, interruptions, fast response and unheard caller.');
