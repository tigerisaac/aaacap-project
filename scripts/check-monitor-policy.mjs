// Text-only check of the connected-call monitoring prompt. Does not exercise Telnyx transcription.
// Usage: node scripts/check-monitor-policy.mjs [case-name] [--repeat N] [--provider openai|go] [--cases path/to/cases.mjs]
import { pathToFileURL } from 'node:url';
import { MONITOR_POLICY_VERSION } from '../dist/cloud/monitoring.js';
import { monitorTarget } from './lib/monitor-target.mjs';
const args = process.argv.slice(2), option = name => { const at = args.indexOf(name); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const repeat = Math.max(1, Number(option('--repeat')) || 1), provider = option('--provider') ?? 'openai', casesPath = option('--cases');
// A separate case file supports held-out checks that never feed back into prompt wording.
const { monitorCases } = await import(casesPath ? pathToFileURL(casesPath).href : './fixtures/monitor-cases.mjs');
const cases = monitorCases.filter(c => !args[0] || c.name === args[0]);
if (!cases.length) throw new Error('unknown_case');
const target = await monitorTarget(provider);

const tally = new Map();
for (let run = 0; run < repeat; run++) for (const c of cases) {
  const start = Date.now(), { assessment, failure, actual } = await target.assess(c.transcript);
  // Same rule as production: an intervention needs a concern and evidence present in the transcript.
  const passed = !failure && (c.expected === 'gray' || actual === c.expected);
  console.log(JSON.stringify({ case: c.name, policyVersion: MONITOR_POLICY_VERSION, expected: c.expected, actual, concern: assessment?.concern, evidence: assessment?.evidence, failure, passed, elapsedMs: Date.now() - start }));
  const t = tally.get(c.name) ?? { expected: c.expected, passed: 0, runs: 0, outcomes: {} };
  t.runs++; if (passed) t.passed++; t.outcomes[actual] = (t.outcomes[actual] ?? 0) + 1; tally.set(c.name, t);
  if (!passed) process.exitCode = 1;
}
const rows = [...tally].map(([name, t]) => ({ name, ...t })), sum = (list, k) => list.reduce((n, r) => n + r[k], 0);
const real = rows.filter(r => r.expected === 'continue'), scams = rows.filter(r => r.expected === 'intervene');
console.log(JSON.stringify({ summary: { policyVersion: MONITOR_POLICY_VERSION, provider, repeat, realConversationsKept: `${sum(real, 'passed')}/${sum(real, 'runs')}`,
  scamsStopped: `${sum(scams, 'passed')}/${sum(scams, 'runs')}`, gray: rows.filter(r => r.expected === 'gray').map(r => ({ case: r.name, outcomes: r.outcomes })),
  misses: rows.filter(r => r.expected !== 'gray' && r.passed < r.runs).map(r => ({ case: r.name, outcomes: r.outcomes })) } }));
