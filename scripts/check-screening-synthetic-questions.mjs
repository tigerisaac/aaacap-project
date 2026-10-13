// Synthetic-only native-history validation with question text for manual quality review.
// Labels and question rubrics stay outside target input. No public/private transcript mode.
import assert from 'node:assert/strict';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digest } from './lib/public-scam-benchmark.mjs';
import { codexScreeningTarget } from './lib/codex-screening-target.mjs';
import { evaluateDialogue, summarizeDialogues } from './check-screening-dialogues.mjs';

export async function evaluateWithQuestions(target, caller) {
  const questions = [], questionMessages = [];
  // Observe returned questions without adding anything to the model's conversation.
  const observed = { ...target, advance: async state => {
    const result = await target.advance(state);
    if (result.kind === 'question') {
      questions.push(result.question ?? '');
      questionMessages.push(structuredClone(result.questionMessages ?? []));
    }
    return result;
  } };
  return { ...await evaluateDialogue(observed, caller), questions, questionMessages };
}

async function main() {
  if (process.argv.includes('--self-test')) {
    let calls = 0;
    const target = { conversation: true, newState: transcript => ({ transcript, questions: 0, researches: 0, validationAttempts: [] }), advance: async state => {
      assert.equal(Object.hasOwn(state, 'questionRubric'), false);
      if (++calls === 1) { state.questions++; return { kind: 'question', question: 'Who is calling, please?' }; }
      return { kind: 'decision', decision: { action: 'approve' } };
    } };
    const result = await evaluateWithQuestions(target, { category: 'legit', turns: ['An appointment needs moving.', 'Her tutor.'], accept: ['approve'], expectedSteps: ['continue', 'approve'], questionRubric: { missing: 'who' } });
    assert.equal(calls, 2); assert.equal(result.passed, true); assert.deepEqual(result.questions, ['Who is calling, please?']);
    assert.deepEqual(result.questionMessages, [[]]);
    const fragments = [{ id: 'm1', phase: 'commentary', text: 'Who is calling?' }, { id: 'm2', phase: 'final_answer', text: 'Who is calling, please?' }];
    const fragmented = { ...target, advance: async state => { state.questions++; return { kind: 'question', question: fragments.map(m => m.text).join(''), questionMessages: fragments }; } };
    const captured = await evaluateWithQuestions(fragmented, { category: 'unclear', turns: ['An incomplete opener.'], accept: ['continue'], expectedSteps: ['continue'] });
    assert.deepEqual(captured.questionMessages, [fragments]); assert.notEqual(captured.questionMessages[0], fragments);
    assert.deepEqual(captured.questions, [fragments.map(m => m.text).join('')]); assert.equal(captured.questionTurns, 1);
    console.log(JSON.stringify({ passed: true, checks: ['question observer leaves input unchanged', 'native sequence preserved', 'question text captured', 'item boundaries preserved without changing joined text or turn counts', 'legacy observation remains supported'] })); return;
  }
  const args = process.argv.slice(2), option = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args.splice(i, 2)[1]; };
  const requestFile = option('--request'), cautionFile = option('--caution-request'), fixtureFile = option('--cases'), out = option('--out');
  const repeat = Number(option('--repeat', '3')), concurrency = Number(option('--concurrency', '4'));
  assert.ok(!args.length && requestFile && fixtureFile && out);
  assert.ok(Number.isInteger(repeat) && repeat > 0 && repeat <= 12);
  assert.ok(Number.isInteger(concurrency) && concurrency > 0 && concurrency <= 8);
  const fixture = await import(pathToFileURL(resolve(fixtureFile)).href);
  assert.equal(fixture.synthetic, true, 'question capture is allowed only for explicitly synthetic fixtures');
  const all = [...(fixture.cases ?? []), ...(fixture.stagedCases ?? [])];
  assert.ok(all.length); assert.equal(new Set(all.map(c => c.name)).size, all.length);
  assert.ok(all.every(c => c.turns.length && c.accept.length)); if (all.some(c => c.caution)) assert.ok(cautionFile);
  const requests = { normal: JSON.parse(await readFile(requestFile, 'utf8')) };
  if (cautionFile) requests.caution = JSON.parse(await readFile(cautionFile, 'utf8'));
  const files = [fixtureFile, requestFile, ...(cautionFile ? [cautionFile] : []), 'scripts/check-screening-synthetic-questions.mjs', 'scripts/check-screening-dialogues.mjs', 'scripts/lib/codex-screening-target.mjs', 'scripts/check-screening-subscription-dialogue.mjs', 'scripts/lib/screening-codex-models.json', 'backend/src/live/policy.ts', 'backend/src/live/evidence.ts', 'dist/live/policy.js', 'dist/live/evidence.js', ...(fixture.sourceFiles ?? [])];
  const hashes = async () => Object.fromEntries(await Promise.all(files.map(async p => [p, digest(await readFile(p))]))), before = await hashes();
  const targets = {}, results = [], jobs = Array.from({ length: repeat }, (_, i) => all.map(c => ({ c, run: i + 1 }))).flat();
  let cursor = 0, stopped = false, writes = Promise.resolve();
  await mkdir(out, { recursive: true }); await writeFile(`${out}/results.jsonl`, '', { flag: 'wx' });
  try {
    for (const [kind, request] of Object.entries(requests)) targets[kind] = await codexScreeningTarget(request, { conversation: true });
    const manifest = { startedAt: new Date().toISOString(), provider: 'codex', model: 'gpt-6-luna', effort: 'medium', transport: targets.normal.transport, sourceHashes: before, requestHashes: Object.fromEntries(Object.entries(requests).map(([k, r]) => [k, digest(JSON.stringify(r))])), repeat, concurrency, planned: jobs.length, cases: all.map(c => ({ name: c.name, category: c.category, focus: c.focus, accept: c.accept, caution: !!c.caution, stages: c.turns.length, inputHash: digest(JSON.stringify(c.turns)), ...(c.expectedSteps ? { expectedSteps: c.expectedSteps } : {}), ...(c.questionRubric ? { questionRubric: c.questionRubric } : {}) })), interpretation: 'Synthetic-only, native assistant/tool history, prepared answers only after questions. Exact sequences scored; question meaning needs separate manual review. No outcome-based retries. Not a voice or real-call evaluation.' };
    await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2), { flag: 'wx' });
    async function worker() {
      while (!stopped && cursor < jobs.length) {
        const { c, run } = jobs[cursor++];
        const row = { case: c.name, category: c.category, focus: c.focus, caution: !!c.caution, run, ...await evaluateWithQuestions(targets[c.caution ? 'caution' : 'normal'], c) };
        results.push(row); writes = writes.then(() => appendFile(`${out}/results.jsonl`, `${JSON.stringify(row)}\n`));
        if (row.failure && row.failure !== 'codex_evaluation_timeout') stopped = true;
        if (results.length % 25 === 0 || stopped) console.log(JSON.stringify({ completed: results.length, planned: jobs.length, stopped }));
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker)); await writes; assert.deepEqual(await hashes(), before);
    const summary = { ...manifest, completedAt: new Date().toISOString(), completed: results.length, stopped, sourcesUnchanged: true, resultsHash: digest(await readFile(`${out}/results.jsonl`)), main: summarizeDialogues(results.filter(r => !r.caution)), caution: summarizeDialogues(results.filter(r => r.caution)) };
    await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ completed: results.length, planned: jobs.length, main: summary.main, caution: summary.caution }));
    if (stopped || results.length !== jobs.length || results.some(r => !r.passed)) process.exitCode = 1;
  } finally { for (const target of Object.values(targets)) await target.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
