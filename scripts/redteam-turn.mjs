// Interactive text sparring with the screening backend: play the caller one turn at a time.
// Usage: node scripts/redteam-turn.mjs <conversation.json> "what the caller says" [--provider openai|go]
// The conversation file is created on the first turn and holds the full backend context between turns.
import { readFile, writeFile } from 'node:fs/promises';
import { screeningTarget, callerSays } from './lib/screening-target.mjs';
const args = process.argv.slice(2), at = args.indexOf('--provider'), provider = at >= 0 ? args.splice(at, 2)[1] : 'openai';
const [file, words] = args;
if (!file || !words) throw new Error('usage: redteam-turn.mjs <conversation.json> "caller words"');
let state;
try { state = JSON.parse(await readFile(file, 'utf8')); } catch { state = undefined; }
if (state?.ended) { console.log(JSON.stringify({ ended: true, outcome: state.outcome })); process.exit(0); }
const target = await screeningTarget(provider);
if (state) callerSays(state, words); else state = target.newState(words);
const step = await target.advance(state);
if (step.kind === 'decision') { state.ended = true; state.outcome = step.decision; }
if (step.kind === 'failure' || step.kind === 'no_decision') { state.ended = true; state.outcome = step; }
await writeFile(file, JSON.stringify(state));
console.log(JSON.stringify(step.kind === 'question' ? { shieldAsks: step.question, questionsSoFar: state.questions }
  : step.kind === 'decision' ? { decision: step.decision } : step));
