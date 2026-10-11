import { describe, expect, it } from 'vitest';
// @ts-expect-error Standalone benchmark helper does not enter the backend build.
import { HONEYPOT, parseHoneypotRecords, honeypotCase, summarizeHoneypot, prevalenceAdjusted } from '../../scripts/lib/honeypot-benchmark.mjs';

// Synthetic records in the paper's released schema. No real call content.
const record = (callId: string, label: string, turns: Array<[string, string]>, extra = {}) => ({
  call_id: callId, caller_id: `pseudo-${callId}`, persona: 'retiree', label_holistic: label, label_scam: label === 'scam',
  asks: [], turns: turns.map(([speaker, text]) => ({ speaker, text })), ...extra });
const scam = record('c1', 'scam', [['agent', 'Hello?'], ['caller', 'This is Medicare benefits.'], ['agent', 'Yes?'], ['caller', 'Read me your [ID] number.']]);
const spam = record('c2', 'spam', [['agent', 'Hello?'], ['caller', 'Calling about your auto warranty quote.']], { label_scam: false });

describe('honeypot corpus adapter', () => {
  it('accepts JSONL, an array or a calls object, and maps speakers without exposing labels', () => {
    for (const text of [[scam, spam].map(r => JSON.stringify(r)).join('\n'), JSON.stringify([scam, spam]), JSON.stringify({ calls: [scam, spam] }, null, 2)]) {
      expect(parseHoneypotRecords(text).map((r: { call_id: string }) => r.call_id)).toEqual(['c1', 'c2']);
    }
    const c = honeypotCase(scam);
    expect(c).toMatchObject({ id: 'honeypot-c1', label: 1, type: 'scam', strictScam: true,
      callerText: 'This is Medicare benefits. Read me your [ID] number.',
      transcript: 'Recipient: Hello?\nCaller: This is Medicare benefits.\nRecipient: Yes?\nCaller: Read me your [ID] number.' });
    expect(JSON.stringify(c)).not.toContain('pseudo-c1');
    expect(honeypotCase(spam)).toMatchObject({ label: 0, type: 'spam', strictScam: false });
  });

  it('keeps whole caller turns up to the opening budget and always the first turn', () => {
    const long = 'x'.repeat(HONEYPOT.openingChars - 10);
    const c = honeypotCase(record('c3', 'spam', [['caller', long], ['caller', 'second turn is past the budget']]));
    expect(c.callerOpening).toBe(long);
    expect(honeypotCase(record('c4', 'spam', [['caller', 'y'.repeat(HONEYPOT.openingChars + 50)]])).callerOpening).toHaveLength(HONEYPOT.openingChars + 50);
  });

  it('fails loudly on schema it was not written for', () => {
    expect(() => honeypotCase(record('c5', 'robocall', [['caller', 'Hi']]))).toThrow('unknown_holistic_label');
    expect(() => honeypotCase(record('c6', 'spam', [['honeypot', 'Hi'], ['caller', 'Hi']]))).toThrow('unknown_turn_shape');
    expect(() => honeypotCase(record('c7', 'spam', [['agent', 'Hello?']]))).toThrow('missing_caller_speech');
    expect(() => honeypotCase(record('bad id', 'spam', [['caller', 'Hi']]))).toThrow('invalid_call_id');
  });

  it('reports scam, strict scam, spam and legitimate groups separately from source labels', () => {
    const row = (type: string, actual: string, reason?: string, extra = {}) => ({ type, strictScam: type === 'scam', screening: { actual, reason, questions: actual === 'continue' ? 1 : 0 }, ...extra });
    const summary = summarizeHoneypot([
      row('scam', 'block', 'scam'), row('scam', 'hold', 'unclear'), row('scam', 'continue'), row('scam', 'approve', 'routine'),
      row('spam', 'block', 'solicitation'), row('spam', 'block', 'scam'), { type: 'spam', screening: { failure: 'http_503' } },
      row('legitimate', 'approve', 'routine'),
    ]);
    expect(summary.screening.scams).toMatchObject({ total: 4, stopped: 2, blocked: 1, clarified: 1, approved: 1, identified: 3 });
    expect(summary.screening.spam).toMatchObject({ total: 3, stopped: 2, failures: 1, byReason: { solicitation: 1, scam: 1 } });
    expect(summary.screening.legitimate).toMatchObject({ total: 1, offered: 1 });
    expect(summary.screening.scamReasonAsDetector).toMatchObject({ scamsFlagged: 1, scamsDecided: 4, spamFlagged: 1, spamDecided: 2 });
    expect(summary.monitoring).toBeNull();
  });

  it('re-estimates precision and F1 at the published prevalence', () => {
    const at = prevalenceAdjusted(0.85, 0.05, 0.15);
    expect(at.precision).toBeCloseTo(0.1275 / (0.1275 + 0.0425));
    expect(prevalenceAdjusted(Number.NaN, 0)).toBeNull();
  });
});
