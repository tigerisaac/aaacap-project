// Production screening on real FTC robocall recordings (NC State robocall-audio-dataset transcripts, public domain).
// Offline text diagnostic of harmful calls stopped; there are no legitimate calls, and no voice, timing or live-call claim.
// Requires `npm run build`. The owner's exception to the synthetic-only evaluation rule covers this dataset only.
// Usage: node scripts/check-robocall-benchmark.mjs [--prepare-only] [--real-calls-approved] [--screening-context opening|full]
//   [--repeat N] [--concurrency N] [--limit N] [--provider go|openai] [--out directory] [--request frozen-screening.json]
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { liveSessionConfig, SCREENING_POLICY_VERSION, LIVE_LIMITS } from '../dist/live/policy.js';
import { screeningTarget } from './lib/screening-target.mjs';
import { digest, parseCSV } from './lib/public-scam-benchmark.mjs';
import { ROBOCALL, robocallCase, selectRobocalls, summarizeRobocalls } from './lib/robocall-benchmark.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('invalid_options'); return args.splice(i, 2)[1]; };
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const integer = (value, fallback, max) => { const n = value === undefined ? fallback : Number(value); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('invalid_count'); return n; };
const prepare = flag('--prepare-only'), approved = flag('--real-calls-approved');
const provider = option('--provider') ?? 'go', context = option('--screening-context') ?? 'opening';
const repeat = integer(option('--repeat'), 1, 100), concurrency = integer(option('--concurrency'), 4, 16);
const limit = integer(option('--limit'), ROBOCALL.expectedRows, ROBOCALL.expectedRows);
const out = resolve(option('--out') ?? `artifacts/public-benchmarks/robocall-${Date.now()}`);
const frozen = option('--request');
if (args.length || !['opening', 'full'].includes(context) || !['go', 'openai'].includes(provider)) throw new Error('invalid_options');

// Pinned download of the transcript metadata only; audio is not fetched. The cache is verified on reuse.
const cache = resolve('artifacts/public-benchmarks'); await mkdir(cache, { recursive: true });
const file = `${cache}/robocall-${ROBOCALL.revision}.csv`, manifestFile = `${file}.json`;
const sourceURL = `https://raw.githubusercontent.com/${ROBOCALL.dataset}/${ROBOCALL.revision}/${ROBOCALL.file}`;
let csv, source;
try {
  csv = await readFile(file, 'utf8'); source = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (digest(csv) !== source.sha256 || source.revision !== ROBOCALL.revision || source.dataset !== ROBOCALL.dataset) throw new Error('cache_integrity_failed');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const response = await fetch(sourceURL, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`dataset_http_${response.status}`);
  csv = await response.text(); source = { ...ROBOCALL, sourceURL, sha256: digest(csv), downloadedAt: new Date().toISOString() };
  if (parseCSV(csv).length !== ROBOCALL.expectedRows) throw new Error('unexpected_dataset_size');
  await writeFile(file, csv); await writeFile(manifestFile, JSON.stringify(source, null, 2));
}
const all = parseCSV(csv).map(robocallCase);
if (all.length !== ROBOCALL.expectedRows || new Set(all.map(c => c.id)).size !== all.length) throw new Error('unexpected_dataset_rows');
const { cases: unique, excluded } = selectRobocalls(all), cases = unique.slice(0, limit);
// Production screening ends at 75 s or 12,000 transcript characters, so full context is capped at that limit.
const screeningInput = c => context === 'opening' ? c.callerOpening : c.callerText.slice(0, LIVE_LIMITS.maxTranscript);
const lengths = values => { const sorted = [...values].sort((a, b) => a - b); return { median: sorted[sorted.length >> 1], max: sorted.at(-1) }; };
// Counts and lengths only; no transcript text is printed.
console.log(JSON.stringify({ dataset: ROBOCALL.dataset, revision: ROBOCALL.revision, rows: all.length, excluded, unique: unique.length,
  selected: cases.length, campaigns: new Set(cases.map(c => c.campaign)).size, screeningContext: context,
  transcriptChars: lengths(cases.map(c => c.callerText.length)), beyondOpening: cases.filter(c => c.callerText.length > ROBOCALL.openingChars).length }));
if (prepare) process.exit(0);
// AGENTS.md limits evaluation to synthetic callers; the owner granted an exception for this public-domain dataset.
if (!approved) throw new Error('real_call_dataset_requires_owner_approval: rerun with --real-calls-approved');

await mkdir(out, { recursive: true });
const resultsFile = `${out}/results.jsonl`;
// Exclusive create avoids silently overwriting an earlier run.
await writeFile(resultsFile, '', { flag: 'wx' });
const productionFiles = ['backend/src/live/policy.ts'];
const hashes = async files => Object.fromEntries(await Promise.all(files.map(async f => [f, digest(await readFile(f, 'utf8'))])));
const request = frozen ? JSON.parse(await readFile(frozen, 'utf8')) : liveSessionConfig().delegation.responses;
const screening = await screeningTarget(provider, { effort: 'medium', request });
const run = { ...source, provider, model: screening.model, effort: 'medium', repeat, concurrency, screeningContext: context,
  screeningVersion: frozen ? 'frozen-request' : SCREENING_POLICY_VERSION, frozenRequest: frozen, screeningRequestHash: digest(JSON.stringify(request)),
  selection: { excluded, unique: unique.length, limit }, fullUniqueSet: cases.length === unique.length,
  selectedIds: cases.map(c => c.id), productionHashesBefore: await hashes(productionFiles), startedAt: new Date().toISOString(),
  realCallApproval: 'Owner exception to the synthetic-only evaluation rule, October 11, 2026, for this public-domain FTC robocall dataset only.',
  interpretation: 'Real illegal-robocall recordings, Whisper transcripts of the robocaller side only. Screening sees one recorded message: about the first 75 s by default, or up to the production transcript limit. No legitimate calls: measures harmful calls stopped only. No voice, timing or live-call claim; the production no-pause robocall timer is not modeled. Results must never tune a production prompt.' };
await writeFile(`${out}/manifest.json`, JSON.stringify(run, null, 2), { flag: 'wx' });
const jobs = Array.from({ length: repeat }, (_, i) => cases.map(c => ({ c, run: i + 1 }))).flat();
const results = []; let cursor = 0, stopped = false, writes = Promise.resolve();
async function worker() {
  while (!stopped && cursor < jobs.length) {
    const { c, run: iteration } = jobs[cursor++], start = Date.now();
    const state = screening.newState(screeningInput(c)), step = await screening.advance(state);
    const result = { id: c.id, sourceHash: c.sourceHash, campaign: c.campaign, copies: c.copies, run: iteration,
      screening: { actual: step.kind === 'decision' ? step.decision.action : step.kind === 'question' ? 'continue' : step.kind,
        reason: step.decision?.reason, failure: step.failure, questions: state.questions, researches: state.researches },
      elapsedMs: Date.now() - start };
    results.push(result);
    // Result rows hold IDs, campaign letter slugs and outcomes; no transcript, quote or caller number.
    writes = writes.then(() => appendFile(resultsFile, `${JSON.stringify(result)}\n`));
    if (/^http_(401|402|403)$/.test(result.screening.failure ?? '')) stopped = true;
    if (results.length % 50 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker)); await writes;
const productionHashesAfter = await hashes(productionFiles);
const summary = { ...run, completedAt: new Date().toISOString(), completed: results.length, planned: jobs.length, stopped,
  sourceResultsHash: digest(await readFile(resultsFile, 'utf8')), productionHashesAfter,
  productionUnchanged: JSON.stringify(run.productionHashesBefore) === JSON.stringify(productionHashesAfter), ...summarizeRobocalls(results) };
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2), { flag: 'wx' });
const { byCampaign, ...headline } = summarizeRobocalls(results);
console.log(JSON.stringify({ headline }));
if (stopped || !summary.productionUnchanged || summary.failures) process.exitCode = 1;
