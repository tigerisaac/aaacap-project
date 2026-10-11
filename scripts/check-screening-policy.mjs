// Text-only model regression. Does not establish recognition, voice latency or real-call safety.
// Usage: node scripts/check-screening-policy.mjs [case-name] [--repeat N] [--cases path/to/cases.mjs] [--provider openai|go] [--caution]
// --caution screens as production does in the 24 hours after a stopped scam.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { SCREENING_POLICY_VERSION } from '../dist/live/policy.js';
import { screeningTarget, callerSays } from './lib/screening-target.mjs';
const args = process.argv.slice(2), option = name => { const at = args.indexOf(name); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const flag = name => { const at = args.indexOf(name); return at >= 0 && !!args.splice(at, 1); };
const caution = flag('--caution');
const repeat = Math.max(1, Number(option('--repeat')) || 1), casesPath = option('--cases'), provider = option('--provider') ?? 'openai', effort = option('--effort');
// A separate case file supports held-out checks that never feed back into prompt wording.
const { liveScreeningCases } = await import(casesPath ? pathToFileURL(casesPath).href : './fixtures/live-screening-cases.mjs');
const scenarios = liveScreeningCases.filter(c => c.text && (!args[0] || c.name === args[0]));
if (!scenarios.length) throw new Error('unknown_case');
const target = await screeningTarget(provider, { effort, context: { recentScamStopped: caution } });
await mkdir('artifacts/policy-eval', { recursive: true });

async function runCase(scenario) {
  // The caller answers only questions Shield actually asks, in order; with no scripted answer left the
  // live call would go silent, so an unanswered question ends as 'continue'.
  const answers = [scenario.followups ?? scenario.followup ?? []].flat();
  const state = target.newState(scenario.text), asked = [];
  let actual = 'no_decision', applied, failure;
  const start = Date.now();
  for (;;) {
    const step = await target.advance(state);
    if (step.kind === 'decision') { actual = step.decision.action; applied = step.decision; break; }
    if (step.kind === 'failure') { failure = step.failure; break; }
    if (step.kind === 'no_decision') break;
    asked.push(step.question);
    if (!answers.length) { actual = 'continue'; break; }
    callerSays(state, answers.shift());
  }
  const passed = !failure && scenario.accept.includes(actual) && (scenario.category !== 'legit' || state.researches === 0);
  return { case: scenario.name, category: scenario.category, provider, model: target.model, policyVersion: SCREENING_POLICY_VERSION, caution,
    accept: scenario.accept, actual, decision: applied, questions: state.questions, asked, researches: state.researches, failure, passed, elapsedMs: Date.now() - start };
}

const tally = new Map();
for (let run = 0; run < repeat; run++) {
  for (const scenario of scenarios) {
    const result = await runCase(scenario);
    if (repeat === 1 && !casesPath && !caution && provider === 'openai') await writeFile(`artifacts/policy-eval/${scenario.name}.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    const t = tally.get(scenario.name) ?? { category: scenario.category, passed: 0, runs: 0, outcomes: {} };
    t.runs++; if (result.passed) t.passed++; t.outcomes[result.actual] = (t.outcomes[result.actual] ?? 0) + 1;
    tally.set(scenario.name, t);
    if (!result.passed) process.exitCode = 1;
    // Authentication or quota errors would fail every case; stop instead of burning the remaining runs.
    if (/^http_(401|402|403)$/.test(result.failure ?? '')) process.exit(1);
  }
}
if (repeat > 1 || scenarios.length > 1) {
  const rows = [...tally].map(([name, t]) => ({ name, ...t }));
  const legit = rows.filter(r => r.category === 'legit'), harmful = rows.filter(r => ['scam', 'robocall'].includes(r.category));
  const sum = (list, k) => list.reduce((n, r) => n + r[k], 0);
  const outcomes = (list, ...actions) => list.reduce((n, r) => n + actions.reduce((m, a) => m + (r.outcomes[a] ?? 0), 0), 0);
  console.log(JSON.stringify({ summary: { policyVersion: SCREENING_POLICY_VERSION, caution, provider, effort: target.effort, repeat,
    legitimateOffered: `${outcomes(legit, 'approve')}/${sum(legit, 'runs')}`, harmfulStopped: `${outcomes(harmful, 'block', 'hold')}/${sum(harmful, 'runs')}`,
    harmfulApproved: outcomes(harmful, 'approve'), harmfulClarifications: outcomes(harmful, 'continue'),
    regressionPasses: `${sum(rows, 'passed')}/${sum(rows, 'runs')}`,
    ...(rows.some(r => r.category === 'deferred') ? { familyOpenersOffered: `${sum(rows.filter(r => r.category === 'deferred'), 'passed')}/${sum(rows.filter(r => r.category === 'deferred'), 'runs')}` } : {}),
    ...(rows.some(r => r.category === 'callback') ? { callbacksHeld: `${sum(rows.filter(r => r.category === 'callback'), 'passed')}/${sum(rows.filter(r => r.category === 'callback'), 'runs')}` } : {}),
    misses: rows.filter(r => r.passed < r.runs).map(r => ({ case: r.name, passed: `${r.passed}/${r.runs}`, outcomes: r.outcomes })) } }));
}
