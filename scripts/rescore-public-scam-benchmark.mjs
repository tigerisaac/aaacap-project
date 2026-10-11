// Rescore saved public results offline; never replace raw outcomes or the original summary.
// Usage: node scripts/rescore-public-scam-benchmark.mjs artifacts/path/to/run
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MASC, MASC_SCORING, digest, summarizeMASC } from './lib/public-scam-benchmark.mjs';

if (process.argv.length !== 3) throw new Error('usage: rescore-public-scam-benchmark.mjs <run-directory>');
const directory = resolve(process.argv[2]);
const raw = await readFile(`${directory}/results.jsonl`, 'utf8');
const original = JSON.parse(await readFile(`${directory}/summary.json`, 'utf8'));
if (original.dataset !== MASC.dataset || original.revision !== MASC.revision) throw new Error('unexpected_dataset');
const rows = raw.trim().split('\n').filter(Boolean).map(JSON.parse);
if (rows.length !== original.completed) throw new Error('completion_count_mismatch');
const selected = new Set(original.selectedIds), seen = new Set();
for (const row of rows) {
  const identity = `${row.id}:${row.run}`;
  if (!selected.has(row.id) || !Number.isInteger(row.run) || row.run < 1 || row.run > original.repeat || seen.has(identity)) throw new Error('invalid_result_identity');
  seen.add(identity);
}
const summary = { ...original, ...summarizeMASC(rows), rescoredAt: new Date().toISOString(),
  rescoring: { originalSummary: 'summary.json', sourceResultsSHA256: digest(raw), modelRequests: 0,
    note: 'Owner changed the identification score after the run. Source groups, raw outcomes, production policies and the original summary are unchanged.' } };
const output = `${directory}/summary-scoring-${MASC_SCORING.version}.json`;
await writeFile(output, JSON.stringify(summary, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, scoringVersion: MASC_SCORING.version, completed: rows.length,
  scamsIdentified: summary.scamsIdentified, completedStops: summary.harmfulStopped, clarifications: summary.harmfulClarifications,
  harmfulApproved: summary.harmfulApproved, adsBlocked: summary.adsBlocked, legitimateOffered: summary.legitimateOffered,
  evaluationFailures: summary.evaluationFailures }));
