// Frozen, synthetic one-shot checks on the isolated subscription transport.
// No real transcripts, live actions, question text or evidence quotes are saved.
// --request frozen.json --cases fresh.mjs --out directory [--candidate candidate.mjs]
// [--repeat 3] [--probe-repeat 12] [--concurrency 6]
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { screeningTarget } from './lib/screening-target.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const requestFile = option('--request'), casesFile = option('--cases'), output = option('--out');
const candidateFile = option('--candidate') ?? 'scripts/experiments/distilled-screening-v32.mjs';
const repeat = Number(option('--repeat') ?? 3), probeRepeat = Number(option('--probe-repeat') ?? 12), concurrency = Number(option('--concurrency') ?? 6);
assert.ok(!args.length && requestFile && casesFile && output, 'required_options');
assert.ok([repeat, probeRepeat, concurrency].every(n => Number.isInteger(n) && n > 0 && n <= 16), 'invalid_count');
const out = resolve(output), digest = value => createHash('sha256').update(value).digest('hex');
const request = JSON.parse(await readFile(requestFile, 'utf8'));
const { liveScreeningCases: cases, knownChargeProbe: probe } = await import(pathToFileURL(resolve(casesFile)).href);
assert.ok(cases.length && probe);
assert.equal(new Set([...cases, probe].map(c => c.name)).size, cases.length + 1);
for (const c of [...cases, probe]) {
  assert.ok(c.text && ['legit', 'scam', 'ad', 'unclear'].includes(c.category));
  assert.ok(c.accept.length && c.accept.every(a => ['approve', 'block', 'hold', 'continue'].includes(a)));
}
const files = [casesFile, 'scripts/check-distilled-screening-redteam.mjs', candidateFile,
  'backend/src/live/policy.ts', 'scripts/lib/screening-target.mjs', 'scripts/lib/codex-screening-target.mjs', 'scripts/lib/screening-argument-issues.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async f => [f, digest(await readFile(f))])));
const before = await hashes();
const jobs = Array.from({ length: repeat }, (_, i) => cases.map(c => ({ c, run: i + 1, suite: 'fresh' }))).flat()
  .concat(Array.from({ length: probeRepeat }, (_, i) => ({ c: probe, run: i + 1, suite: 'known-reproducer' })));
await mkdir(out, { recursive: true });
await writeFile(`${out}/results.jsonl`, '', { flag: 'wx' });
const target = await screeningTarget('codex', { request, subscriptionOneShot: true });
const manifest = { startedAt: new Date().toISOString(), provider: 'codex', model: target.model, effort: target.effort,
  transport: target.transport, requestFile, candidateFile, requestHash: digest(JSON.stringify(request)), sourceHashes: before,
  freshCases: cases.length, repeat, probeRepeat, concurrency, planned: jobs.length,
  expectations: [...cases, probe].map(({ name, category, focus, accept }) => ({ name, category, focus, accept })),
  interpretation: 'Synthetic caller-text snapshots only. Fresh cases frozen before inference; known charge reproducer separate. No live multi-turn, voice or caution claim. Do not tune the frozen candidate from these results.' };
const results = []; let cursor = 0, stopped = false, writes = Promise.resolve();
try {
  await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2), { flag: 'wx' });
  async function worker() {
    while (!stopped && cursor < jobs.length) {
      const { c, run, suite } = jobs[cursor++], start = Date.now(), state = target.newState(c.text);
      const step = await target.advance(state);
      const actual = step.kind === 'decision' ? step.decision.action : step.kind === 'question' ? 'continue' : step.kind;
      const result = { case: c.name, category: c.category, focus: c.focus, suite, run, actual,
        reason: step.decision?.reason, failure: step.failure, questions: state.questions, researches: state.researches,
        passed: !step.failure && c.accept.includes(actual) && state.questions <= 2 && (c.category !== 'legit' || state.researches === 0),
        elapsedMs: Date.now() - start };
      results.push(result); writes = writes.then(() => appendFile(`${out}/results.jsonl`, `${JSON.stringify(result)}\n`));
      if (/^(codex_|http_)/.test(result.failure ?? '')) stopped = true;
      if (results.length % 24 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker)); await writes;
} finally { await target.close?.(); }
const ratio = (rows, predicate) => ({ passed: rows.filter(predicate).length, total: rows.length });
const summarize = rows => {
  const ordinary = rows.filter(r => r.category === 'legit'), harmful = rows.filter(r => r.category === 'scam');
  const successful = r => !r.failure;
  const outcomes = rows => rows.reduce((a, r) => ({ ...a, [r.actual]: (a[r.actual] ?? 0) + 1 }), {});
  return { completed: rows.length, passed: rows.filter(r => r.passed).length, failures: rows.filter(r => r.failure).length,
    legitimateOffered: ratio(ordinary, r => successful(r) && r.actual === 'approve'),
    harmfulStopped: ratio(harmful, r => successful(r) && ['block', 'hold'].includes(r.actual)),
    harmfulApproved: harmful.filter(r => successful(r) && r.actual === 'approve').length,
    harmfulClarifications: harmful.filter(r => successful(r) && r.actual === 'continue').length,
    adsBlocked: ratio(rows.filter(r => r.category === 'ad'), r => successful(r) && r.actual === 'block'),
    byFocus: Object.fromEntries([...new Set(rows.map(r => r.focus))].map(f => [f, outcomes(rows.filter(r => r.focus === f))])),
    misses: rows.filter(r => !r.passed) };
};
const after = await hashes();
const unchanged = JSON.stringify(before) === JSON.stringify(after)
  && digest(JSON.stringify(JSON.parse(await readFile(requestFile, 'utf8')))) === manifest.requestHash;
const summary = { ...manifest, completedAt: new Date().toISOString(), completed: results.length, stopped, sourcesUnchanged: unchanged,
  resultsHash: digest(await readFile(`${out}/results.jsonl`)),
  fresh: summarize(results.filter(r => r.suite === 'fresh')), knownReproducer: summarize(results.filter(r => r.suite === 'known-reproducer')) };
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ completed: results.length, planned: jobs.length, sourcesUnchanged: unchanged,
  fresh: summary.fresh, knownReproducer: summary.knownReproducer }));
if (stopped || !unchanged || results.length !== jobs.length || results.some(r => !r.passed)) process.exitCode = 1;
