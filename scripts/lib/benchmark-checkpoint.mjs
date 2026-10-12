// Resume interrupted public runs without replacing a single completed outcome.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash = text => createHash('sha256').update(text).digest('hex');
const key = row => `${row.id}:${row.run}`;

export async function benchmarkCheckpoint(out, run, jobs, resume) {
  if (!resume) {
    await writeFile(`${out}/results.jsonl`, '', { flag: 'wx' });
    await writeFile(`${out}/manifest.json`, JSON.stringify(run, null, 2), { flag: 'wx' });
    return { run, results: [], jobs, planned: jobs.length };
  }
  try { await readFile(`${out}/summary.json`); throw new Error('cannot_resume_finalized_run'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const original = JSON.parse(await readFile(`${out}/manifest.json`, 'utf8'));
  for (const field of ['provider', 'model', 'effort', 'mode', 'repeat', 'screeningRequestHash', 'screeningContext',
    'revision', 'sha256', 'selectedIds', 'scoring', 'monitorVersion', 'monitorContextChars', 'selection']) {
    if (JSON.stringify(original[field]) !== JSON.stringify(run[field])) throw new Error(`resume_mismatch:${field}`);
  }
  const raw = await readFile(`${out}/results.jsonl`, 'utf8');
  if (raw && !raw.endsWith('\n')) throw new Error('resume_partial_result_line');
  const results = raw.trim() ? raw.trim().split('\n').map(JSON.parse) : [];
  const expected = new Map(jobs.map(j => [key({ id: j.c.id, run: j.run }), j.c])), seen = new Set();
  for (const row of results) {
    const identity = key(row), fixture = expected.get(identity);
    if (!fixture || seen.has(identity) || fixture.sourceHash !== row.sourceHash || fixture.copies !== row.copies) throw new Error('resume_result_identity_mismatch');
    seen.add(identity);
  }
  await appendFile(`${out}/resume-events.jsonl`, `${JSON.stringify({ resumedAt: new Date().toISOString(), completed: results.length,
    priorResultsBytes: Buffer.byteLength(raw), priorResultsHash: hash(raw), concurrency: run.concurrency,
    transport: run.transport, interpretation: 'Completed outcomes are preserved byte-for-byte, including failures. Only missing case/run pairs are scheduled; interrupted in-flight calls may be requested again.' })}\n`);
  return { run: original, results, jobs: jobs.filter(j => !seen.has(key({ id: j.c.id, run: j.run }))), planned: jobs.length };
}
