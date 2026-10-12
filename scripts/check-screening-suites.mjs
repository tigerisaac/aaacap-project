// Concurrent synthetic development/regression checks with an optional frozen production request.
// No public dataset loading here. Usage: --cases file.mjs[,file.mjs] --out directory
// [--request frozen-request.json] [--repeat 3] [--concurrency 8] [--provider go] [--caution]
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { liveSessionConfig, SCREENING_POLICY_VERSION } from '../dist/live/policy.js';
import { screeningTarget, callerSays } from './lib/screening-target.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const cautionAt = args.indexOf('--caution'), caution = cautionAt >= 0;
if (caution) args.splice(cautionAt, 1);
const files = (option('--cases') ?? 'scripts/fixtures/live-screening-cases.mjs').split(',');
const out = resolve(option('--out') ?? `artifacts/screening-suites/${Date.now()}`);
const frozen = option('--request'), provider = option('--provider') ?? 'go';
const repeat = Number(option('--repeat') ?? 3), concurrency = Number(option('--concurrency') ?? 8);
if (args.length || ![repeat, concurrency].every(n => Number.isInteger(n) && n > 0 && n <= 16) || (frozen && caution)) throw new Error('invalid_options');
const request = frozen ? JSON.parse(await readFile(frozen, 'utf8')) : liveSessionConfig({ recentScamStopped: caution }).delegation.responses;
const digest = x => createHash('sha256').update(x).digest('hex');
const fixtures = [];
const sourceHashes = {};
for (const file of files) {
  sourceHashes[file] = digest(await readFile(file));
  const { liveScreeningCases } = await import(pathToFileURL(resolve(file)).href);
  fixtures.push(...liveScreeningCases.filter(c => c.text).map(c => ({ ...c, suite: file })));
}
const target = await screeningTarget(provider, { request });
await mkdir(out, { recursive: true });
await writeFile(`${out}/results.jsonl`, '', { flag: 'wx' });
const manifest = { startedAt: new Date().toISOString(), policyVersion: frozen ? 'frozen-request' : SCREENING_POLICY_VERSION,
  provider, model: target.model, effort: target.effort, caution: request.instructions.includes('RECENT SCAM:'), frozen, repeat, concurrency,
  requestHash: digest(JSON.stringify(request)), instructionChars: request.instructions.length, sourceHashes };
await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2), { flag: 'wx' });
const jobs = Array.from({ length: repeat }, (_, i) => fixtures.map(c => ({ c, run: i + 1 }))).flat();
const results = []; let cursor = 0, stopped = false, writes = Promise.resolve();
async function worker() {
  while (!stopped && cursor < jobs.length) {
    const { c, run } = jobs[cursor++], start = Date.now(), state = target.newState(c.text);
    const answers = [c.followups ?? c.followup ?? []].flat();
    let actual = 'no_decision', failure;
    for (;;) {
      const step = await target.advance(state);
      if (step.kind === 'decision') { actual = step.decision.action; break; }
      if (step.kind !== 'question') { failure = step.failure; break; }
      actual = 'continue';
      if (!answers.length) break;
      callerSays(state, answers.shift());
    }
    const result = { suite: c.suite, case: c.name, category: c.category, run, actual, failure,
      passed: !failure && c.accept.includes(actual) && (c.category !== 'legit' || state.researches === 0),
      questions: state.questions, researches: state.researches, elapsedMs: Date.now() - start };
    results.push(result);
    writes = writes.then(() => appendFile(`${out}/results.jsonl`, JSON.stringify(result) + '\n'));
    if (/^http_(401|402|403|429)$/.test(failure ?? '')) stopped = true;
    if (results.length % 50 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker)); await writes;
const summarize = rows => {
  const ordinary = rows.filter(r => r.category === 'legit'), harmful = rows.filter(r => ['scam', 'robocall'].includes(r.category));
  return { completed: rows.length, passed: rows.filter(r => r.passed).length, failures: rows.filter(r => r.failure).length,
    legitimateOffered: `${ordinary.filter(r => r.actual === 'approve').length}/${ordinary.length}`,
    harmfulStopped: `${harmful.filter(r => ['block', 'hold'].includes(r.actual)).length}/${harmful.length}`,
    harmfulApproved: harmful.filter(r => r.actual === 'approve').length, harmfulClarifications: harmful.filter(r => r.actual === 'continue').length,
    misses: rows.filter(r => !r.passed) };
};
const summary = { ...manifest, completedAt: new Date().toISOString(), planned: jobs.length, stopped,
  resultHash: digest(await readFile(`${out}/results.jsonl`)), ...summarize(results),
  suites: Object.fromEntries(files.map(file => [file, summarize(results.filter(r => r.suite === file))])) };
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2));
const { misses, suites, ...headline } = summary; console.log(JSON.stringify(headline));
if (stopped || summary.failures || summary.passed !== jobs.length) process.exitCode = 1;
