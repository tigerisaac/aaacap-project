// Same authored messages as the fresh conversation set, not additional independent cases.
// This tests post-call content policy only; no audio, ingestion, or live decision is simulated.
import { cases, stagedCases } from './production-conversations-v155.mjs';
import { digest } from '../../lib/public-scam-benchmark.mjs';
export const sourceFiles = ['scripts/fixtures/holdout/production-conversations-v155.mjs'];
export const messageCases = [...cases, ...stagedCases].map(c => {
  const text = c.turns.join(' ');
  const expected = ['scam', 'ad'].includes(c.category) || c.accept.includes('block') ? 'remove' : 'keep';
  return { id: c.name, group: expected === 'remove' ? 'unwanted' : 'ordinary-or-uncertain', expected, text, sourceHash: digest(text) };
});
