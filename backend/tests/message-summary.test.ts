import { describe, expect, it } from 'vitest';
import { safeMessageSummary } from '../src/cloud/message-summary.js';

describe('saved message summary safety', () => {
  it('preserves an attributed summary and a stated date', () => {
    expect(safeMessageSummary('  The caller reported an appointment on 2026-10-15.  ')).toBe('The caller reported an appointment on 2026-10-15.');
  });
  it.each(['Call 202-555-0199 to check.', 'Go to https://example.test.', 'Email bank@example.test.'])('rejects actionable contact details: %s', summary => {
    expect(safeMessageSummary(summary)).toBeUndefined();
  });
  it('accepts unavailable summaries without fabricating text', () => {
    expect(safeMessageSummary(null)).toBeUndefined(); expect(safeMessageSummary(undefined)).toBeUndefined();
    expect(safeMessageSummary(' ')).toBeUndefined(); expect(safeMessageSummary('x'.repeat(601))).toBeUndefined();
  });
});
