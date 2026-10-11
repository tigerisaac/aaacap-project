// Text-only check of the connected-call monitoring prompt. Does not exercise Telnyx transcription.
// Usage: node scripts/check-monitor-policy.mjs [case-name] [--repeat N] [--provider openai|go]
import { randomUUID } from 'node:crypto';
import { monitorRequest, warrantsIntervention, assessmentSchema } from '../dist/cloud/monitoring.js';
import { monitorCases } from './fixtures/monitor-cases.mjs';
import { PROVIDERS, providerKey } from './lib/screening-target.mjs';
const args = process.argv.slice(2), option = name => { const at = args.indexOf(name); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const repeat = Math.max(1, Number(option('--repeat')) || 1), provider = option('--provider') ?? 'openai';
const cases = monitorCases.filter(c => !args[0] || c.name === args[0]);
if (!cases.length) throw new Error('unknown_case');
const key = await providerKey(provider);
// OpenCode Go chooses its own processing tier; only OpenAI gets the production Fast-mode request.
const request = transcript => { const r = monitorRequest(transcript); if (provider === 'go') delete r.service_tier; return r; };

async function assess(transcript) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
    const r = await fetch(PROVIDERS[provider].url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': 'shield-screening-check/1.0',
        ...(provider === 'go' ? { 'x-opencode-session': randomUUID() } : {}) }, body: JSON.stringify(request(transcript)) });
    if (r.status === 429 || r.status >= 500) continue;
    if (!r.ok) return { failure: `http_${r.status}` };
    const body = await r.json(), call = body.output?.find(i => i.type === 'function_call' && i.name === 'assess_call');
    const parsed = assessmentSchema.safeParse(JSON.parse(call?.arguments ?? 'null'));
    return parsed.success ? { assessment: parsed.data } : { failure: 'invalid_assessment' };
  }
  return { failure: 'unavailable' };
}

const tally = new Map();
for (let run = 0; run < repeat; run++) for (const c of cases) {
  const start = Date.now(), { assessment, failure } = await assess(c.transcript);
  // Same rule as production: an intervention needs a concern and evidence present in the transcript.
  const actual = failure ? 'failure' : warrantsIntervention(assessment, c.transcript) ? 'intervene' : 'continue';
  const passed = c.expected === 'gray' || actual === c.expected;
  console.log(JSON.stringify({ case: c.name, expected: c.expected, actual, concern: assessment?.concern, evidence: assessment?.evidence, failure, passed, elapsedMs: Date.now() - start }));
  const t = tally.get(c.name) ?? { expected: c.expected, passed: 0, runs: 0, outcomes: {} };
  t.runs++; if (passed) t.passed++; t.outcomes[actual] = (t.outcomes[actual] ?? 0) + 1; tally.set(c.name, t);
  if (!passed) process.exitCode = 1;
}
const rows = [...tally].map(([name, t]) => ({ name, ...t })), sum = (list, k) => list.reduce((n, r) => n + r[k], 0);
const real = rows.filter(r => r.expected === 'continue'), scams = rows.filter(r => r.expected === 'intervene');
console.log(JSON.stringify({ summary: { provider, repeat, realConversationsKept: `${sum(real, 'passed')}/${sum(real, 'runs')}`,
  scamsStopped: `${sum(scams, 'passed')}/${sum(scams, 'runs')}`, gray: rows.filter(r => r.expected === 'gray').map(r => ({ case: r.name, outcomes: r.outcomes })),
  misses: rows.filter(r => r.expected !== 'gray' && r.passed < r.runs).map(r => ({ case: r.name, outcomes: r.outcomes })) } }));
