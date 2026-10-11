// Separate MASC-specific binary classification runner. No Shield screening/monitoring request is used.
// node scripts/check-masc-classifier.mjs [--dataset masc|development] [--repeat N] [--concurrency N]
//   [--limit-per-type N] [--prepare-only] [--out directory]
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { MASC, digest, parseCSV, mascCase } from './lib/public-scam-benchmark.mjs';
import { MASC_CLASSIFIER_VERSION, MASC_CLASSIFIER_MODEL, mascClassifierRequest, createMASCClassifier, summarizeMASCClassifier } from './lib/masc-classifier.mjs';
import development from './fixtures/masc-classifier-development.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('invalid_options'); return args.splice(i, 2)[1]; };
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const integer = (value, fallback, max) => { const n = value === undefined ? fallback : Number(value); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('invalid_count'); return n; };
const dataset = option('--dataset') ?? 'masc', repeat = integer(option('--repeat'), 1, 100), concurrency = integer(option('--concurrency'), 4, 8);
const perType = integer(option('--limit-per-type'), 320, 320), prepare = flag('--prepare-only');
const out = resolve(option('--out') ?? `artifacts/masc-classifier/${dataset}-${Date.now()}`);
if (args.length || !['masc', 'development'].includes(dataset)) throw new Error('invalid_options');

let all, source;
if (dataset === 'development') {
  all = development.map(c => ({ ...c, sourceHash: digest(c.transcript) }));
  source = { dataset: 'independently-authored-masc-development', sha256: digest(JSON.stringify(development)), expectedRows: development.length };
} else {
  const cache = resolve('artifacts/public-benchmarks'); await mkdir(cache, { recursive: true });
  const file = `${cache}/masc-${MASC.revision}.csv`, manifestFile = `${file}.json`;
  const sourceURL = `https://huggingface.co/datasets/${MASC.dataset}/resolve/${MASC.revision}/${MASC.file}`;
  let csv;
  try {
    csv = await readFile(file, 'utf8'); source = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (digest(csv) !== source.sha256 || source.revision !== MASC.revision || source.file !== MASC.file || source.dataset !== MASC.dataset) throw new Error('cache_integrity_failed');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(sourceURL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`dataset_http_${response.status}`);
    csv = await response.text(); source = { ...MASC, sourceURL, sha256: digest(csv), downloadedAt: new Date().toISOString() };
    if (parseCSV(csv).length !== MASC.expectedRows) throw new Error('unexpected_dataset_size');
    await writeFile(file, csv); await writeFile(manifestFile, JSON.stringify(source, null, 2));
  }
  all = parseCSV(csv).map(mascCase);
  if (all.length !== MASC.expectedRows) throw new Error('unexpected_dataset_size');
}
const counts = {}, cases = all.filter(c => {
  if ((counts[c.type] ?? 0) >= perType) return false;
  counts[c.type] = (counts[c.type] ?? 0) + 1; return true;
});
if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('duplicate_case_id');
console.log(JSON.stringify({ dataset: source.dataset, selected: cases.length, byType: counts,
  context: 'full-both-speakers', maxConversationChars: Math.max(...cases.map(c => c.transcript.length)) }));
if (prepare) process.exit(0);

// Fresh directory and exclusive files preserve every earlier run. Freeze before any model request.
await mkdir(out, { recursive: true });
const resultsFile = `${out}/results.jsonl`; await writeFile(resultsFile, '', { flag: 'wx' });
const sourceFiles = ['scripts/check-masc-classifier.mjs', 'scripts/lib/masc-classifier.mjs', 'scripts/lib/public-scam-benchmark.mjs', 'scripts/fixtures/masc-classifier-development.mjs'];
const productionFiles = ['backend/src/live/policy.ts', 'backend/src/cloud/monitoring.ts'];
const hashes = async files => Object.fromEntries(await Promise.all(files.map(async file => [file, digest(await readFile(file, 'utf8'))])));
const run = { ...source, classifierVersion: MASC_CLASSIFIER_VERSION, provider: 'go', model: MASC_CLASSIFIER_MODEL, effort: 'medium',
  repeat, concurrency, selectedIds: cases.map(c => c.id), expectedByType: counts, fullTestSplit: dataset === 'masc' && cases.length === MASC.expectedRows,
  requestHash: digest(JSON.stringify(mascClassifierRequest('Caller: freeze.\nRecipient: freeze.'))),
  sourceHashes: await hashes(sourceFiles), productionHashesBefore: await hashes(productionFiles), frozenAt: new Date().toISOString(),
  protocol: { context: 'Entire completed conversation, both speakers, no truncation.',
    labelPolicy: 'Original binary MASC labels, including insurance sales and wrong numbers as non-scams. No clarifications or ad-blocking credit.',
    modelInput: 'Conversation text only; source labels, types, IDs, personalities and prior outcomes excluded.',
    scoring: 'Accuracy includes every planned row. Conventional binary metrics require a complete failure-free run. No label-based retries.',
    adaptation: 'Benchmark-adapted after prior MASC outcomes were known; task/context changes only, no public-row examples or answer mappings. Not a fresh unseen-test claim.',
    safety: 'Offline classifier only; no production request, call-control action, lookup, deployment or real call.' } };
await writeFile(`${out}/manifest.json`, JSON.stringify(run, null, 2), { flag: 'wx' });
const credentials = JSON.parse(await readFile(`${homedir()}/.local/share/opencode/auth.json`, 'utf8'));
const classify = createMASCClassifier(credentials['opencode-go']?.key);
const jobs = Array.from({ length: repeat }, (_, i) => cases.map(c => ({ c, run: i + 1 }))).flat();
const results = []; let cursor = 0, stopped = false, writes = Promise.resolve();
async function worker() {
  while (!stopped && cursor < jobs.length) {
    const { c, run: iteration } = jobs[cursor++], started = Date.now();
    const outcome = await classify(c.transcript);
    const row = { id: c.id, sourceHash: c.sourceHash, type: c.type, label: c.label, run: iteration, ...outcome, elapsedMs: Date.now() - started };
    results.push(row);
    // No transcript, generated reason, evidence, phone number or caller URL is saved or printed.
    writes = writes.then(() => appendFile(resultsFile, `${JSON.stringify(row)}\n`));
    if (/^http_(401|402|403)$/.test(outcome.failure ?? '')) stopped = true;
    if (results.length % 20 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker)); await writes;
const productionHashesAfter = await hashes(productionFiles), sourceHashesAfter = await hashes(sourceFiles);
const summary = { ...run, ...summarizeMASCClassifier(results, cases, repeat), stopped, completedAt: new Date().toISOString(),
  sourceResultsHash: digest(await readFile(resultsFile, 'utf8')), sourceHashesAfter, productionHashesAfter,
  classifierUnchanged: JSON.stringify(run.sourceHashes) === JSON.stringify(sourceHashesAfter),
  productionUnchanged: JSON.stringify(run.productionHashesBefore) === JSON.stringify(productionHashesAfter) };
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ summary }));
if (!summary.complete || !summary.classifierUnchanged || !summary.productionUnchanged || summary.accuracy.correct !== summary.accuracy.total) process.exitCode = 1;
