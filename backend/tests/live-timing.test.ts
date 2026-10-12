import { describe, expect, it, vi } from 'vitest';
import { ScreeningSession } from '../src/live/session.js';
import { callTiming, responseUsage, type TimingSink } from '../src/live/timing.js';

const continueDecision = { action: 'continue', reason: 'unclear', purpose: 'other', evidence: '', hasName: true, hasReason: true };
const holdDecision = { ...continueDecision, action: 'hold', evidence: 'an account issue' };

function run(timing?: TimingSink) {
  let now = 1000;
  const io = { openai: vi.fn(), telnyx: vi.fn(), finish: vi.fn().mockResolvedValue(undefined), close: vi.fn(), timing };
  const session = new ScreeningSession(io, () => now);
  const response = (type: string, extra = {}) => session.event({ type: 'response.event', delegation_id: 'private-provider-id', event: { type, ...extra } });
  const tool = (decision: object, call_id: string) => response('response.output_item.done', {
    item: { type: 'function_call', name: 'screen_call', call_id, arguments: JSON.stringify(decision) }
  });
  session.start();
  now = 1400; session.event({ type: 'session.started', session: { model: 'gpt-live-1' } });
  now = 1500; session.input(1, Buffer.alloc(160, 10).toString('base64'));
  session.event({ type: 'session.input_transcript.delta', delta: 'A synthetic business calling about an account issue.' });
  session.event({ type: 'session.delegation.created', delegation: { id: 'private-provider-id' } });
  now = 1600; response('response.created');
  now = 2400; session.tick();
  now = 11600; tool(continueDecision, 'tool-1');
  now = 11800; response('response.completed');
  now = 12000; response('response.created');
  now = 13100; session.event({ type: 'session.output_audio.delta', delta: Buffer.alloc(160, 10).toString('base64') });
  session.tick();
  now = 13500; session.event({ type: 'session.input_transcript.delta', delta: ' It remains an account issue.' });
  now = 14000; response('response.created');
  now = 15000; tool(holdDecision, 'tool-2');
  now = 15020; response('response.completed', { response: { usage: { input_tokens: 3000,
    input_tokens_details: { cached_tokens: 2000 }, output_tokens: 120, output_tokens_details: { reasoning_tokens: 80 } } } });
  return io;
}

describe('Content-free screening timings', () => {
  it('separates the slow backend, resumption, and audible playback without changing model or carrier events', () => {
    const entries: { phase: string; metrics: any }[] = [];
    const timed = run((phase, metrics) => entries.push({ phase, metrics }));
    const plain = run();
    expect(timed.openai.mock.calls).toEqual(plain.openai.mock.calls);
    expect(timed.telnyx.mock.calls).toEqual(plain.telnyx.mock.calls);
    expect(timed.finish.mock.calls).toEqual(plain.finish.mock.calls);
    expect(timed.finish).toHaveBeenCalledExactlyOnceWith(holdDecision);
    expect(entries.find(e => e.phase === 'decision_received')?.metrics).toMatchObject({ response: 1, responseMs: 10000 });
    expect(entries.find(e => e.phase === 'response_resume_sent')?.metrics).toMatchObject({ response: 1, responseMs: 10200 });
    expect(entries.find(e => e.phase === 'assistant_audio_sent')?.metrics).toMatchObject({ sinceClarificationMs: 1500, sinceCallerAudioMs: 11600 });
    expect(entries.filter(e => e.phase === 'caller_speech_paused')).toHaveLength(1);
    expect(entries.some(e => e.phase === 'terminal_decision')).toBe(true);
    expect(entries.find(e => e.phase === 'response_usage')?.metrics).toMatchObject({ inputTokens: 3000, cachedInputTokens: 2000, reasoningTokens: 80 });
    expect(JSON.stringify(entries)).not.toMatch(/synthetic business|account issue|private-provider-id|tool-1/);
  });

  it('keeps screening unchanged even if the timing sink throws', () => {
    const broken = run(() => { throw new Error('diagnostic_failure'); });
    const plain = run();
    expect(broken.openai.mock.calls).toEqual(plain.openai.mock.calls);
    expect(broken.telnyx.mock.calls).toEqual(plain.telnyx.mock.calls);
    expect(broken.finish.mock.calls).toEqual(plain.finish.mock.calls);
  });

  it('filters injected content and invalid metrics, caps routine logs, and retains terminal timings', () => {
    const entries: object[] = [];
    const timing = callTiming('synthetic-call', 1000, () => 1250, entry => entries.push(entry));
    timing('response_started', { response: 1, responseMs: 250, backendBusy: true,
      responseArguments: 'secret content', sessionMs: 'secret content', redirectMs: -1, researchMs: Infinity } as any);
    expect(entries[0]).toEqual({ event: 'live_timing', callId: 'synthetic-call', phase: 'response_started', elapsedMs: 250, response: 1, responseMs: 250, backendBusy: true });
    timing('caller-controlled-phase' as any, {});
    for (let i = 0; i < 300; i++) timing('response_started', {});
    expect(entries).toHaveLength(240);
    timing('handoff_finished', { handoffMs: 100 });
    expect(entries).toHaveLength(241);
    expect(JSON.stringify(entries)).not.toContain('secret content');
    expect(() => callTiming('synthetic-call', 1000, () => 1250, () => { throw new Error('disk_full'); })('bridge_claimed', {})).not.toThrow();
  });

  it('extracts only numeric usage and a known processing tier from a response', () => {
    const entries: object[] = [];
    callTiming('synthetic-call', 0, () => 1, e => entries.push(e))('response_usage', responseUsage({
      output: 'private model reasoning', service_tier: 'priority', usage: { input_tokens: 2000,
        input_tokens_details: { cached_tokens: 1800, cache_write_tokens: 100, text: 'private caller words' },
        output_tokens: 50, output_tokens_details: { reasoning_tokens: 30 } }
    }));
    expect(entries[0]).toMatchObject({ inputTokens: 2000, cachedInputTokens: 1800, cacheWriteTokens: 100,
      outputTokens: 50, reasoningTokens: 30, priorityTier: true });
    expect(JSON.stringify(entries)).not.toContain('private');
  });
});
