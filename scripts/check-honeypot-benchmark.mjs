// Production screening/monitoring on the voice-agent honeypot corpus: REAL de-identified scam and spam calls.
// Offline text diagnostic, not a live-call or voice result. Requires `npm run build` and a local copy of the release.
// Usage: node scripts/check-honeypot-benchmark.mjs --source path/to/release.jsonl [--prepare-only] [--real-calls-approved]
//   [--mode both|screening|monitor] [--screening-context opening|full] [--repeat N] [--concurrency N]
//   [--limit-per-type N] [--provider go|openai] [--out directory]
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { SCREENING_POLICY_VERSION, LIVE_LIMITS } from '../dist/live/policy.js';
import { screeningTarget } from './lib/screening-target.mjs';
import { monitorTarget } from './lib/monitor-target.mjs';
import { MONITOR_LIMITS } from '../dist/cloud/monitoring.js';
import { digest } from './lib/public-scam-benchmark.mjs';
import { HONEYPOT, parseHoneypotRecords, honeypotCase, summarizeHoneypot } from './lib/honeypot-benchmark.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('invalid_options'); return args.splice(i, 2)[1]; };
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const integer = (value, fallback, max) => { const n = value === undefined ? fallback : Number(value); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('invalid_count'); return n; };
const source = option('--source'), prepare = flag('--prepare-only'), approved = flag('--real-calls-approved');
const provider = option('--provider') ?? 'go', mode = option('--mode') ?? 'both', context = option('--screening-context') ?? 'opening';
const repeat = integer(option('--repeat'), 1, 100), concurrency = integer(option('--concurrency'), 4, 16);
const perType = integer(option('--limit-per-type'), 20000, 20000);
const out = resolve(option('--out') ?? `artifacts/public-benchmarks/honeypot-${Date.now()}`);
if (args.length || !source || !['both', 'screening', 'monitor'].includes(mode) || !['opening', 'full'].includes(context)
  || !['go', 'openai'].includes(provider)) throw new Error('invalid_options');

// The release is obtained manually under its licence; this runner never downloads it.
const text = await readFile(resolve(source), 'utf8');
const all = parseHoneypotRecords(text).map(honeypotCase);
if (new Set(all.map(c => c.id)).size !== all.length) throw new Error('duplicate_call_id');
const seen = new Set(), counts = {}, cases = [];
for (const c of all) {
  if (seen.has(c.sourceHash)) continue; seen.add(c.sourceHash);
  if ((counts[c.type] ?? 0) >= perType) continue;
  counts[c.type] = (counts[c.type] ?? 0) + 1; cases.push(c);
}
// Production screening ends at 75 s or 12,000 transcript characters, so full context is capped at that limit.
const screeningInput = c => context === 'opening' ? c.callerOpening : c.callerText.slice(0, LIVE_LIMITS.maxTranscript);
const monitorChars = MONITOR_LIMITS.keepChars;
const lengths = values => { const sorted = [...values].sort((a, b) => a - b); return { median: sorted[sorted.length >> 1], max: sorted.at(-1) }; };
const sourceInfo = { dataset: HONEYPOT.dataset, paper: HONEYPOT.paper, licence: HONEYPOT.licence, sourceFile: basename(source), sha256: digest(text), records: all.length };
// Counts and lengths only; no transcript text, caller pseudonym or label detail beyond group sizes is printed.
console.log(JSON.stringify({ ...sourceInfo, unique: seen.size, selected: cases.length, byType: counts,
  strictScams: cases.filter(c => c.type === 'scam' && c.strictScam).length,
  expectedPublicSubset: HONEYPOT.publicSubset, screeningContext: context,
  callerOpeningChars: lengths(cases.map(c => c.callerOpening.length)), callerTextChars: lengths(cases.map(c => c.callerText.length)),
  callerTextBeyondProductionLimit: cases.filter(c => c.callerText.length > LIVE_LIMITS.maxTranscript).length,
  transcriptChars: lengths(cases.map(c => c.transcript.length)), transcriptsBeyondMonitorWindow: cases.filter(c => c.transcript.length > monitorChars).length }));
if (prepare) process.exit(0);
// AGENTS.md limits evaluation to synthetic callers. This public research corpus needs the owner's explicit exception.
if (!approved) throw new Error('real_call_corpus_requires_owner_approval: rerun with --real-calls-approved once the owner has agreed');

await mkdir(out, { recursive: true });
const resultsFile = `${out}/results.jsonl`;
// Exclusive create avoids silently overwriting an earlier run.
await writeFile(resultsFile, '', { flag: 'wx' });
const productionFiles = ['backend/src/live/policy.ts', 'backend/src/cloud/monitoring.ts'];
const hashes = async files => Object.fromEntries(await Promise.all(files.map(async file => [file, digest(await readFile(file, 'utf8'))])));
const screening = mode !== 'monitor' ? await screeningTarget(provider, { effort: 'medium' }) : undefined;
const monitor = mode !== 'screening' ? await monitorTarget(provider) : undefined;
const run = { ...sourceInfo, provider, model: screening?.model ?? monitor.model, effort: 'medium', mode, repeat, concurrency, screeningContext: context,
  openingChars: HONEYPOT.openingChars, screeningVersion: SCREENING_POLICY_VERSION, monitorVersion: monitor?.policyVersion, monitorContextChars: monitor?.contextChars,
  selectedIds: cases.map(c => c.id), expectedByType: counts, productionHashesBefore: await hashes(productionFiles), startedAt: new Date().toISOString(),
  realCallApproval: 'Owner exception to the synthetic-only evaluation rule, recorded by --real-calls-approved.',
  interpretation: 'Real calls answered by a researcher LLM persona, with automatic source labels. Screening sees caller speech only: the opening by default (about 75 s), or all caller speech up to the production transcript limit. Monitoring sees the production rolling tail once, at the end. Shield stops scams and solicitation, so scam, spam and legitimate groups are reported separately. Not a voice, timing or live-call result. Results must never tune a production prompt.' };
await writeFile(`${out}/manifest.json`, JSON.stringify(run, null, 2), { flag: 'wx' });
const jobs = Array.from({ length: repeat }, (_, i) => cases.map(c => ({ c, run: i + 1 }))).flat();
const results = []; let cursor = 0, stopped = false, writes = Promise.resolve();
async function worker() {
  while (!stopped && cursor < jobs.length) {
    const { c, run: iteration } = jobs[cursor++], start = Date.now();
    const result = { id: c.id, sourceHash: c.sourceHash, type: c.type, label: c.label, strictScam: c.strictScam, run: iteration };
    // Screening and monitoring are independent checks of the same call, so they run concurrently.
    await Promise.all([
      screening && (async () => {
        const state = screening.newState(screeningInput(c)), step = await screening.advance(state);
        result.screening = { actual: step.kind === 'decision' ? step.decision.action : step.kind === 'question' ? 'continue' : step.kind,
          reason: step.decision?.reason, failure: step.failure, questions: state.questions, researches: state.researches };
      })(),
      monitor && (async () => {
        const step = await monitor.assess(c.transcript);
        result.monitor = { actual: step.actual, concern: step.assessment?.concern, failure: step.failure };
      })(),
    ]);
    result.elapsedMs = Date.now() - start; results.push(result);
    // Console and result rows contain no conversation text, quotes, caller pseudonyms, numbers or URLs.
    writes = writes.then(() => appendFile(resultsFile, `${JSON.stringify(result)}\n`));
    if (Object.values(result).some(v => v && /^http_(401|402|403)$/.test(v.failure ?? ''))) stopped = true;
    if (results.length % 20 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker)); await writes;
const productionHashesAfter = await hashes(productionFiles);
const summary = { ...run, completedAt: new Date().toISOString(), completed: results.length, planned: jobs.length, stopped,
  sourceResultsHash: digest(await readFile(resultsFile, 'utf8')), productionHashesAfter,
  productionUnchanged: JSON.stringify(run.productionHashesBefore) === JSON.stringify(productionHashesAfter), ...summarizeHoneypot(results) };
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ screening: summary.screening, monitoring: summary.monitoring }));
if (stopped || !summary.productionUnchanged || results.some(r => r.screening?.failure || r.monitor?.failure)) process.exitCode = 1;
