import { describe, expect, it } from 'vitest';
// @ts-expect-error Standalone benchmark helper does not enter the backend build.
import { ROBOCALL, robocallCase, selectRobocalls, summarizeRobocalls } from '../../scripts/lib/robocall-benchmark.mjs';

// Synthetic rows in the dataset's metadata.csv shape. No real recording text.
const row = (name: string, transcript: string, language = 'en', campaign = 'letter-a') =>
  ({ file_name: `audio-wav-16khz/${name}_normalized.wav`, language, transcript, case_details: campaign, case_pdf: 'pdf_files/a.pdf' });

describe('robocall dataset adapter', () => {
  it('maps a row to caller speech without exposing campaign details to the screening input', () => {
    const c = robocallCase(row('101', '  Press one   now to lower your rate. '), 7);
    expect(c).toMatchObject({ id: 'robocall-7', language: 'en', campaign: 'letter-a',
      callerText: 'Press one now to lower your rate.', callerOpening: 'Press one now to lower your rate.' });
    expect(robocallCase({ ...row('102', 'x'), file_name: 'audio-wav-16khz/a.gen[1]_b.wav' }, 0).id).toBe('robocall-0');
    expect(() => robocallCase({ ...row('102', 'x'), file_name: 'audio-wav-16khz/../escape.wav' }, 0)).toThrow('invalid_file_name');
    expect(() => robocallCase(row('102', 'x'))).toThrow('invalid_row_index');
  });

  it('cuts the opening at a word boundary near 75 seconds of speech', () => {
    const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
    const c = robocallCase(row('103', words), 0);
    expect(c.callerOpening.length).toBeLessThanOrEqual(ROBOCALL.openingChars);
    expect(words.startsWith(`${c.callerOpening} `)).toBe(true);
  });

  it('keeps one English case per distinct recording and counts every exclusion', () => {
    const { cases, excluded } = selectRobocalls([
      row('1', 'Your warranty expires. Press 1.'), row('2', 'your WARRANTY expires... press 1'), row('3', '...'),
      row('4', 'Ni hao', 'zh'), row('5', 'Call back about your account.'),
    ].map((r, i) => robocallCase(r, i)));
    expect(cases.map((c: { id: string }) => c.id)).toEqual(['robocall-0', 'robocall-4']);
    expect(cases[0].copies).toBe(2);
    expect(excluded).toEqual({ nonEnglish: 1, empty: 1, duplicate: 1 });
  });

  it('separates completed stops, clarifications, approvals and failures, weighted by replayed copies', () => {
    const r = (actual: string, extra: Record<string, unknown> = {}, campaign = 'letter-a', copies = 1) =>
      ({ campaign, copies, screening: { actual, questions: actual === 'continue' ? 1 : 0, ...extra } });
    const summary = summarizeRobocalls([r('block', { reason: 'robocall' }, 'letter-a', 3), r('block', { reason: 'scam' }), r('hold', { reason: 'unclear' }),
      r('continue'), r('approve', { reason: 'routine' }, 'letter-b', 2), r('no_decision'), { campaign: 'letter-b', copies: 1, screening: { actual: 'failure', failure: 'http_503' } }]);
    expect(summary).toMatchObject({ total: 7, stopped: 3, blocked: 2, held: 1, clarified: 1, identified: 4, approved: 1, otherOutcomes: 1, failures: 1, noDecisions: 1,
      byReason: { robocall: 1, scam: 1, unclear: 1 }, callWeighted: { calls: 10, stopped: 5, approved: 2 } });
    expect(summary.byCampaign).toEqual({ 'letter-a': { total: 5, stopped: 3, approved: 0, savedUnverified: 0 }, 'letter-b': { total: 2, stopped: 0, approved: 1, savedUnverified: 0 } });
  });
  it('reports saved notices separately without stop or identification credit', () => {
    const summary = summarizeRobocalls([
      { campaign: 'a', copies: 4, screening: { actual: 'message' } },
      { campaign: 'a', copies: 2, screening: { actual: 'message', failure: 'mock_failure' } },
      { campaign: 'a', copies: 1, screening: { actual: 'no_decision' } },
    ]);
    expect(summary).toMatchObject({ total: 3, stopped: 0, identified: 0, approved: 0, savedUnverified: 1,
      failures: 1, otherOutcomes: 1, noDecisions: 1, callWeighted: { calls: 7, stopped: 0, approved: 0, savedUnverified: 4 },
      byCampaign: { a: { total: 3, stopped: 0, approved: 0, savedUnverified: 1 } } });
  });
});
