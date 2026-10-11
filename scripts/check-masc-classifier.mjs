// Separate MASC-specific binary classification runner. No Shield screening/monitoring request is used.
// node scripts/check-masc-classifier.mjs [--version v1|v2|v3] [--dataset masc|masc-train|development] [--repeat N] [--concurrency N]
//   [--limit-per-type N] [--prepare-only] [--out directory]
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { MASC, digest, parseCSV, mascCase } from './lib/public-scam-benchmark.mjs';
import { MASC_CLASSIFIER_VERSION, MASC_CLASSIFIER_MODEL, mascClassifierRequest, createMASCClassifier, summarizeMASCClassifier } from './lib/masc-classifier.mjs';
import { MASC_CLASSIFIER_V2_VERSION, mascClassifierV2Request } from './lib/masc-classifier-v2.mjs';
import { MASC_CLASSIFIER_V3_VERSION, mascEnsembleProtocol, createMASCEnsemble } from './lib/masc-classifier-v3.mjs';
import development from './fixtures/masc-classifier-development.mjs';
import riskDevelopment from './fixtures/masc-classifier-risk-development.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('invalid_options'); return args.splice(i, 2)[1]; };
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const integer = (value, fallback, max) => { const n = value === undefined ? fallback : Number(value); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('invalid_count'); return n; };
const dataset = option('--dataset') ?? 'masc', repeat = integer(option('--repeat'), 1, 100), concurrency = integer(option('--concurrency'), 4, 8);
const version = option('--version') ?? 'v3';
const perType = integer(option('--limit-per-type'), 1280, 1280), prepare = flag('--prepare-only');
const out = resolve(option('--out') ?? `artifacts/masc-classifier/${dataset}-${Date.now()}`);
if (args.length || !['masc', 'masc-train', 'development'].includes(dataset) || !['v1', 'v2', 'v3'].includes(version)) throw new Error('invalid_options');
const request = { v1: mascClassifierRequest, v2: mascClassifierV2Request, v3: mascEnsembleProtocol }[version];
const classifierVersion = { v1: MASC_CLASSIFIER_VERSION, v2: MASC_CLASSIFIER_V2_VERSION, v3: MASC_CLASSIFIER_V3_VERSION }[version];
// The training split was never used to develop any classifier version, so it serves as unseen same-source data.
const split = dataset === 'masc-train' ? { ...MASC, file: 'agent_conversation_train.csv', expectedRows: 1280, cacheName: 'masc-train', idPrefix: 'masc-train' }
  : { ...MASC, cacheName: 'masc', idPrefix: 'masc-test' };

let all, source;
if (dataset === 'development') {
  const expanded = [...development, ...riskDevelopment];
  all = expanded.map(c => ({ ...c, sourceHash: digest(c.transcript) }));
  source = { dataset: 'independently-authored-masc-development', sha256: digest(JSON.stringify(expanded)), expectedRows: expanded.length };
} else {
  const cache = resolve('artifacts/public-benchmarks'); await mkdir(cache, { recursive: true });
  const { cacheName, idPrefix, ...pinned } = split;
  const file = `${cache}/${cacheName}-${pinned.revision}.csv`, manifestFile = `${file}.json`;
  const sourceURL = `https://huggingface.co/datasets/${pinned.dataset}/resolve/${pinned.revision}/${pinned.file}`;
  let csv;
  try {
    csv = await readFile(file, 'utf8'); source = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (digest(csv) !== source.sha256 || source.revision !== pinned.revision || source.file !== pinned.file || source.dataset !== pinned.dataset) throw new Error('cache_integrity_failed');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(sourceURL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`dataset_http_${response.status}`);
    csv = await response.text(); source = { ...pinned, sourceURL, sha256: digest(csv), downloadedAt: new Date().toISOString() };
    if (parseCSV(csv).length !== pinned.expectedRows) throw new Error('unexpected_dataset_size');
    await writeFile(file, csv); await writeFile(manifestFile, JSON.stringify(source, null, 2));
  }
  all = parseCSV(csv).map((row, i) => ({ ...mascCase(row, i), id: `${idPrefix}-${i}` }));
  if (all.length !== pinned.expectedRows) throw new Error('unexpected_dataset_size');
}
const counts = {}, cases = all.filter(c => {
  if ((counts[c.type] ?? 0) >= perType) return false;
  counts[c.type] = (counts[c.type] ?? 0) + 1; return true;
});
if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('duplicate_case_id');
console.log(JSON.stringify({ dataset: source.dataset, classifierVersion, selected: cases.length, byType: counts,
  context: 'full-both-speakers', maxConversationChars: Math.max(...cases.map(c => c.transcript.length)) }));
if (prepare) process.exit(0);

// Fresh directory and exclusive files preserve every earlier run. Freeze before any model request.
await mkdir(out, { recursive: true });
const resultsFile = `${out}/results.jsonl`; await writeFile(resultsFile, '', { flag: 'wx' });
const sourceFiles = ['scripts/check-masc-classifier.mjs', 'scripts/lib/masc-classifier.mjs', 'scripts/lib/masc-classifier-v2.mjs', 'scripts/lib/masc-classifier-v3.mjs', 'scripts/lib/public-scam-benchmark.mjs', 'scripts/fixtures/masc-classifier-development.mjs', 'scripts/fixtures/masc-classifier-risk-development.mjs'];
const productionFiles = ['backend/src/live/policy.ts', 'backend/src/cloud/monitoring.ts'];
const hashes = async files => Object.fromEntries(await Promise.all(files.map(async file => [file, digest(await readFile(file, 'utf8'))])));
const run = { ...source, classifierVersion, provider: 'go', model: MASC_CLASSIFIER_MODEL, effort: 'medium',
  repeat, concurrency, requestsPerValidCase: version === 'v3' ? 2 : 1, selectedIds: cases.map(c => c.id), expectedByType: counts,
  fullTestSplit: dataset === 'masc' && cases.length === MASC.expectedRows, fullTrainSplit: dataset === 'masc-train' && cases.length === split.expectedRows,
  requestHash: digest(JSON.stringify(request('Caller: freeze.\nRecipient: freeze.'))),
  sourceHashes: await hashes(sourceFiles), productionHashesBefore: await hashes(productionFiles), frozenAt: new Date().toISOString(),
  protocol: { context: 'Entire completed conversation, both speakers, no truncation.',
    labelPolicy: 'Original binary MASC labels, including insurance sales and wrong numbers as non-scams. No clarifications or ad-blocking credit.',
    reduction: version === 'v3' ? mascEnsembleProtocol('Caller: freeze.\nRecipient: freeze.').reduction : 'Single judgment.',
    modelInput: 'Conversation text only; source labels, types, IDs, personalities and prior outcomes excluded.',
    scoring: 'Accuracy includes every planned row. Conventional binary metrics require a complete failure-free run. No label-based retries.',
    adaptation: 'Benchmark-adapted after prior MASC test outcomes were known; task/context, general fraud-versus-privacy distinctions and (v3) a unanimous v1+v2 vote only, no public-row examples or answer mappings. Not a fresh unseen-test claim on the test split; the training split was not used for development.',
    safety: 'Offline classifier only; no production request, call-control action, lookup, deployment or real call.' } };
await writeFile(`${out}/manifest.json`, JSON.stringify(run, null, 2), { flag: 'wx' });
const credentials = JSON.parse(await readFile(`${homedir()}/.local/share/opencode/auth.json`, 'utf8'));
const key = credentials['opencode-go']?.key;
const classify = version === 'v3' ? createMASCEnsemble(key) : createMASCClassifier(key, { request });
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
// v3 rows keep both independent votes, so each component is also scored on the same rows. Diagnostic only.
const voteDiagnostics = version !== 'v3' ? undefined : Object.fromEntries(['v1', 'v2'].map(v => {
  const voted = results.map(r => ({ label: r.label, prediction: r.votes?.find(x => x.version === v)?.prediction })).filter(x => [0, 1].includes(x.prediction));
  return [v, { decided: voted.length, correct: voted.filter(x => x.prediction === x.label).length,
    falsePositives: voted.filter(x => x.label === 0 && x.prediction === 1).length, falseNegatives: voted.filter(x => x.label === 1 && x.prediction === 0).length }];
}));
const summary = { ...run, ...summarizeMASCClassifier(results, cases, repeat), voteDiagnostics, stopped, completedAt: new Date().toISOString(),
  sourceResultsHash: digest(await readFile(resultsFile, 'utf8')), sourceHashesAfter, productionHashesAfter,
  classifierUnchanged: JSON.stringify(run.sourceHashes) === JSON.stringify(sourceHashesAfter),
  productionUnchanged: JSON.stringify(run.productionHashesBefore) === JSON.stringify(productionHashesAfter) };
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ summary }));
if (!summary.complete || !summary.classifierUnchanged || !summary.productionUnchanged || summary.accuracy.correct !== summary.accuracy.total) process.exitCode = 1;
