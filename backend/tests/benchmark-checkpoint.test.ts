import { afterEach, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error Evaluation helpers are standalone JS, outside the backend build.
import { benchmarkCheckpoint } from '../../scripts/lib/benchmark-checkpoint.mjs';
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(p => rm(p, { recursive: true, force: true }))); });
const run = { provider: 'codex', model: 'gpt-6-luna', effort: 'medium', repeat: 2, screeningRequestHash: 'frozen', selectedIds: ['a'], concurrency: 4 };
const jobs = [1, 2].map(iteration => ({ c: { id: 'a', sourceHash: 'source', copies: 3 }, run: iteration }));
async function setup() { const out = await mkdtemp(join(tmpdir(), 'shield-checkpoint-')); dirs.push(out); await benchmarkCheckpoint(out, run, jobs, false); return out; }
it('preserves completed outcomes including failures, and schedules only missing trials', async () => {
  const out = await setup();
  const raw = JSON.stringify({ id: 'a', sourceHash: 'source', copies: 3, run: 1, screening: { actual: 'failure', failure: 'http_429' } }) + '\n';
  await writeFile(`${out}/results.jsonl`, raw);
  const resumed = await benchmarkCheckpoint(out, { ...run, concurrency: 8 }, jobs, true);
  expect(resumed.results).toHaveLength(1); expect(resumed.jobs).toEqual([jobs[1]]); expect(resumed.planned).toBe(2);
  expect(await readFile(`${out}/results.jsonl`, 'utf8')).toBe(raw);
  expect(JSON.parse(await readFile(`${out}/manifest.json`, 'utf8'))).toEqual(run);
  expect(JSON.parse((await readFile(`${out}/resume-events.jsonl`, 'utf8')).trim())).toMatchObject({ completed: 1, concurrency: 8, priorResultsBytes: Buffer.byteLength(raw) });
});
it('refuses provider or prompt changes and refuses to overwrite finalized evidence', async () => {
  const out = await setup();
  await expect(benchmarkCheckpoint(out, { ...run, provider: 'go' }, jobs, true)).rejects.toThrow('resume_mismatch:provider');
  await expect(benchmarkCheckpoint(out, { ...run, screeningRequestHash: 'changed' }, jobs, true)).rejects.toThrow('resume_mismatch:screeningRequestHash');
  await expect(benchmarkCheckpoint(out, run, jobs, false)).rejects.toMatchObject({ code: 'EEXIST' });
  await writeFile(`${out}/summary.json`, '{}');
  await expect(benchmarkCheckpoint(out, run, jobs, true)).rejects.toThrow('cannot_resume_finalized_run');
});
it('rejects duplicate, changed-source or partial results instead of silently discarding them', async () => {
  const out = await setup(); const row = { id: 'a', sourceHash: 'source', copies: 3, run: 1 };
  for (const rows of [[row, row], [{ ...row, sourceHash: 'changed' }], [{ ...row, copies: 1 }]]) {
    await writeFile(`${out}/results.jsonl`, rows.map(r => JSON.stringify(r)+'\n').join(''));
    await expect(benchmarkCheckpoint(out, run, jobs, true)).rejects.toThrow('resume_result_identity_mismatch');
  }
  await writeFile(`${out}/results.jsonl`, '{');
  await expect(benchmarkCheckpoint(out, run, jobs, true)).rejects.toThrow('resume_partial_result_line');
});
