// Text-only check of the voicemail keep-or-remove question. Skips transcription; never use real voicemails.
// Usage: node scripts/check-voicemail-policy.mjs [case-name] [--repeat N] [--cases path/to/cases.mjs]
// Uses the production Responses request. Go is the default free text provider; OpenAI is optional.
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { decideVoicemail, voicemailVerdict, VOICEMAIL_POLICY_VERSION } from '../dist/cloud/voicemail-check.js';
import { providerKey, PROVIDERS } from './lib/screening-target.mjs';
const args = process.argv.slice(2), option = name => { const at = args.indexOf(name); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const repeat = Math.max(1, Number(option('--repeat')) || 1), casesPath = option('--cases'), provider = option('--provider') ?? 'go';
const { voicemailCases } = await import(casesPath ? pathToFileURL(casesPath).href : './fixtures/voicemail-cases.mjs');
const cases = voicemailCases.filter(c => !args[0] || c.name === args[0]);
if (!cases.length) throw new Error('unknown_case');
if (!['go', 'openai'].includes(provider)) throw new Error('unsupported_provider');
const key = await providerKey(provider);
const session = randomUUID();
const fetcher = (_url, init) => fetch(PROVIDERS[provider].url, { ...init,
  headers: provider === 'go' ? { ...Object.fromEntries(new Headers(init.headers)), 'x-opencode-session': session } : init.headers });

const tally = new Map();
for (let run = 0; run < repeat; run++) for (const c of cases) {
  const start = Date.now(), assessment = await decideVoicemail(c.transcript, key, fetcher);
  // Same rule as production, for an unsaved caller and a message long enough not to count as silence.
  const verdict = voicemailVerdict({ transcript: c.transcript, duration: 30, assessment });
  const actual = verdict === 'keep' ? 'keep' : 'remove', passed = !!assessment && actual === c.expected;
  console.log(JSON.stringify({ case: c.name, policyVersion: VOICEMAIL_POLICY_VERSION, expected: c.expected, actual, verdict,
    assessed: !!assessment, summarized: !!assessment?.summary, provider,
    failure: assessment ? undefined : 'no_answer', passed, elapsedMs: Date.now() - start }));
  const t = tally.get(c.name) ?? { expected: c.expected, passed: 0, runs: 0, outcomes: {} };
  t.runs++; if (passed) t.passed++; t.outcomes[verdict] = (t.outcomes[verdict] ?? 0) + 1; tally.set(c.name, t);
  if (!passed) process.exitCode = 1;
}
const rows = [...tally].map(([name, t]) => ({ name, ...t })), sum = (list, k) => list.reduce((n, r) => n + r[k], 0);
const real = rows.filter(r => r.expected === 'keep'), junk = rows.filter(r => r.expected === 'remove');
console.log(JSON.stringify({ summary: { policyVersion: VOICEMAIL_POLICY_VERSION, repeat, realMessagesKept: `${sum(real, 'passed')}/${sum(real, 'runs')}`,
  scamsAndJunkRemoved: `${sum(junk, 'passed')}/${sum(junk, 'runs')}`, misses: rows.filter(r => r.passed < r.runs).map(r => ({ case: r.name, outcomes: r.outcomes })) } }));
