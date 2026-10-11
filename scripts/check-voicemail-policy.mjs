// Text-only check of the voicemail keep-or-remove question. Skips transcription; never use real voicemails.
// Usage: node scripts/check-voicemail-policy.mjs [case-name] [--repeat N] [--cases path/to/cases.mjs]
// The Decisions API is OpenAI-only, so this uses the production key from Secret Manager (a fraction of a cent per run).
import { pathToFileURL } from 'node:url';
import { decideVoicemail, voicemailVerdict, VOICEMAIL_POLICY_VERSION } from '../dist/cloud/voicemail-check.js';
import { providerKey } from './lib/screening-target.mjs';
const args = process.argv.slice(2), option = name => { const at = args.indexOf(name); return at >= 0 ? args.splice(at, 2)[1] : undefined; };
const repeat = Math.max(1, Number(option('--repeat')) || 1), casesPath = option('--cases');
const { voicemailCases } = await import(casesPath ? pathToFileURL(casesPath).href : './fixtures/voicemail-cases.mjs');
const cases = voicemailCases.filter(c => !args[0] || c.name === args[0]);
if (!cases.length) throw new Error('unknown_case');
const key = await providerKey('openai');

const tally = new Map();
for (let run = 0; run < repeat; run++) for (const c of cases) {
  const start = Date.now(), probabilities = await decideVoicemail(c.transcript, key);
  // Same rule as production, for an unsaved caller and a message long enough not to count as silence.
  const verdict = voicemailVerdict({ savedContact: false, transcript: c.transcript, duration: 30, probabilities });
  const actual = verdict === 'keep' ? 'keep' : 'remove', passed = !!probabilities && actual === c.expected;
  console.log(JSON.stringify({ case: c.name, policyVersion: VOICEMAIL_POLICY_VERSION, expected: c.expected, actual, verdict, probabilities,
    failure: probabilities ? undefined : 'no_answer', passed, elapsedMs: Date.now() - start }));
  const t = tally.get(c.name) ?? { expected: c.expected, passed: 0, runs: 0, outcomes: {} };
  t.runs++; if (passed) t.passed++; t.outcomes[verdict] = (t.outcomes[verdict] ?? 0) + 1; tally.set(c.name, t);
  if (!passed) process.exitCode = 1;
}
const rows = [...tally].map(([name, t]) => ({ name, ...t })), sum = (list, k) => list.reduce((n, r) => n + r[k], 0);
const real = rows.filter(r => r.expected === 'keep'), junk = rows.filter(r => r.expected === 'remove');
console.log(JSON.stringify({ summary: { policyVersion: VOICEMAIL_POLICY_VERSION, repeat, realMessagesKept: `${sum(real, 'passed')}/${sum(real, 'runs')}`,
  scamsAndJunkRemoved: `${sum(junk, 'passed')}/${sum(junk, 'runs')}`, misses: rows.filter(r => r.passed < r.runs).map(r => ({ case: r.name, outcomes: r.outcomes })) } }));
