// Rescore a saved MASC classifier run under the owner's label adjudication; never replace raw outcomes or the original summary.
// Usage: node scripts/rescore-masc-classifier.mjs artifacts/masc-classifier/<run>
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MASC, digest } from './lib/public-scam-benchmark.mjs';
import { summarizeMASCClassifier } from './lib/masc-classifier.mjs';
import { MASC_ADJUDICATION, adjudicateMASCCases } from './lib/masc-adjudication.mjs';

if (process.argv.length !== 3) throw new Error('usage: rescore-masc-classifier.mjs <run-directory>');
const directory = resolve(process.argv[2]);
const raw = await readFile(`${directory}/results.jsonl`, 'utf8');
const original = JSON.parse(await readFile(`${directory}/summary.json`, 'utf8'));
if (original.dataset !== MASC.dataset || original.revision !== MASC.revision) throw new Error('unexpected_dataset');
if (digest(raw) !== original.sourceResultsHash) throw new Error('results_hash_mismatch');
const rows = raw.trim().split('\n').filter(Boolean).map(JSON.parse);
// Every planned case must appear in the saved rows, so case identity and source labels come from the run itself.
const cases = original.selectedIds.map(id => {
  const row = rows.find(r => r.id === id);
  if (!row) throw new Error('unrun_case_cannot_be_rescored');
  return { id, sourceHash: row.sourceHash, type: row.type, label: row.label };
});
const { cases: adjudicated, applied } = adjudicateMASCCases(cases);
const summary = { ...original, ...summarizeMASCClassifier(rows, adjudicated, original.repeat), rescoredAt: new Date().toISOString(),
  adjudication: { ...MASC_ADJUDICATION, applied, originalSummary: 'summary.json', sourceResultsSHA256: digest(raw), modelRequests: 0,
    note: 'Adjudicated after outcomes were observed. The original-label summary remains the comparable MASC score.' } };
const output = `${directory}/summary-${MASC_ADJUDICATION.version}.json`;
await writeFile(output, JSON.stringify(summary, null, 2), { flag: 'wx' });
const brief = s => ({ accuracy: s.accuracy, scamsCorrect: s.scamsCorrect, nonScamsCorrect: s.nonScamsCorrect, f1: s.binaryMetrics?.f1 ?? null });
console.log(JSON.stringify({ output, applied, original: brief(original), adjudicated: brief(summary) }));
