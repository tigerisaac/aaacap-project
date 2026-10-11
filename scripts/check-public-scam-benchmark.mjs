// Offline, full-conversation diagnostics, NOT an early-screen or real-call safety score.
// Usage: node scripts/check-public-scam-benchmark.mjs [--prepare-only] [--mode both|screening|monitor]
//   [--repeat N] [--concurrency N] [--limit-per-type N] [--provider go|openai] [--out directory]
// Default: pinned MASC test split, all 320 cases, both production prompts, medium reasoning, free Go.
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SCREENING_POLICY_VERSION } from '../dist/live/policy.js';
import { screeningTarget } from './lib/screening-target.mjs';
import { monitorTarget } from './lib/monitor-target.mjs';
import { MASC, digest, parseCSV, mascCase, summarizeMASC } from './lib/public-scam-benchmark.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const integer = (value, fallback, max) => { const n = value === undefined ? fallback : Number(value); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('invalid_count'); return n; };
const prepare = flag('--prepare-only'), provider = option('--provider') ?? 'go', mode = option('--mode') ?? 'both';
const repeat = integer(option('--repeat'), 1, 100), concurrency = integer(option('--concurrency'), 4, 8);
const perType = integer(option('--limit-per-type'), 320, 320);
const out = resolve(option('--out') ?? `artifacts/public-benchmarks/masc-${Date.now()}`);
if (args.length || !['both', 'screening', 'monitor'].includes(mode) || !['go', 'openai'].includes(provider)) throw new Error('invalid_options');
const cache = 'artifacts/public-benchmarks'; await mkdir(cache, { recursive: true });
const sourceFile = `${cache}/masc-${MASC.revision}.csv`, manifestFile = `${sourceFile}.json`;
const sourceURL = `https://huggingface.co/datasets/${MASC.dataset}/resolve/${MASC.revision}/${MASC.file}`;
let csv, manifest;
try {
  csv = await readFile(sourceFile, 'utf8'); manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (digest(csv) !== manifest.sha256 || manifest.revision !== MASC.revision) throw new Error('cache_integrity_failed');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const response = await fetch(sourceURL, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`dataset_http_${response.status}`);
  csv = await response.text(); manifest = { ...MASC, sourceURL, sha256: digest(csv), downloadedAt: new Date().toISOString() };
  // Validate before preserving the download; do not fetch the all/train splits.
  if (parseCSV(csv).length !== MASC.expectedRows) throw new Error('unexpected_dataset_size');
  await writeFile(sourceFile, csv); await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
}
const all = parseCSV(csv).map(mascCase);
if (all.length !== MASC.expectedRows) throw new Error('unexpected_dataset_size');
const seen = new Set(), counts = {}, cases = [];
for (const c of all) {
  if (seen.has(c.sourceHash)) continue; seen.add(c.sourceHash);
  if ((counts[c.type] ?? 0) >= perType) continue;
  counts[c.type] = (counts[c.type] ?? 0) + 1; cases.push(c);
}
console.log(JSON.stringify({ dataset: MASC.dataset, revision: MASC.revision, rows: all.length, unique: seen.size, selected: cases.length, byType: counts }));
if (prepare) process.exit(0);
await mkdir(out, { recursive: true });
const resultsFile = `${out}/results.jsonl`;
// Exclusive create avoids silently overwriting an earlier run.
await writeFile(resultsFile, '', { flag: 'wx' });
const screening = mode !== 'monitor' ? await screeningTarget(provider, { effort: 'medium' }) : undefined;
const monitor = mode !== 'screening' ? await monitorTarget(provider) : undefined;
const run = { ...manifest, provider, model: screening?.model ?? monitor.model, effort: 'medium', mode, repeat, concurrency,
  screeningVersion: SCREENING_POLICY_VERSION, monitorVersion: monitor?.policyVersion,
  monitorContextChars: monitor?.contextChars,
  conversationsBeyondMonitorWindow: monitor ? cases.filter(c => c.transcript.length > monitor.contextChars).length : undefined,
  selectedIds: cases.map(c => c.id), startedAt: new Date().toISOString(),
  scoreGroups: { scams: cases.filter(c => c.label === 1).length, ordinary: cases.filter(c => c.screeningGroup === 'legitimate').length,
    ads: cases.filter(c => c.type === 'insurance').length, wrongNumbers: cases.filter(c => c.type === 'wrong').length },
  interpretation: 'Offline completed-call diagnostic; screening sees all caller turns, monitoring sees the production rolling tail of both sides. No early-intervention or voice claim. Insurance sales excluded from scam/ordinary scores and scored separately for ad blocking at screening. Wrong numbers excluded from ordinary scores. Public test results must never tune the prompt.' };
await writeFile(`${out}/manifest.json`, JSON.stringify(run, null, 2));
const jobs = Array.from({ length: repeat }, (_, i) => cases.map(c => ({ c, run: i + 1 }))).flat();
const results = []; let cursor = 0, stopped = false;
let writes = Promise.resolve();
async function worker() {
  while (!stopped && cursor < jobs.length) {
    const { c, run } = jobs[cursor++], start = Date.now();
    const result = { id: c.id, sourceHash: c.sourceHash, type: c.type, label: c.label, personality: c.personality, screeningGroup: c.screeningGroup, run };
    if (screening) {
      const state = screening.newState(c.callerText), step = await screening.advance(state);
      result.screening = { actual: step.kind === 'decision' ? step.decision.action : step.kind === 'question' ? 'continue' : step.kind,
        reason: step.decision?.reason, failure: step.failure, questions: state.questions, researches: state.researches };
    }
    if (monitor && !/^http_(401|402|403)$/.test(result.screening?.failure ?? '')) {
      const step = await monitor.assess(c.transcript);
      result.monitor = { actual: step.actual, concern: step.assessment?.concern, failure: step.failure };
    }
    result.elapsedMs = Date.now() - start; results.push(result);
    // Console and result rows contain no conversation text, quotes, secrets, numbers or URLs from callers.
    writes = writes.then(() => appendFile(resultsFile, `${JSON.stringify(result)}\n`));
    if (Object.values(result).some(v => v && /^http_(401|402|403)$/.test(v.failure ?? ''))) stopped = true;
    if (results.length % 20 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker)); await writes;
const summary = { ...run, completedAt: new Date().toISOString(), completed: results.length, planned: jobs.length, stopped,
  ...summarizeMASC(results),
};
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ summary }));
if (stopped || summary.evaluationFailures) process.exitCode = 1;
