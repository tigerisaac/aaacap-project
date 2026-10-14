import assert from 'node:assert/strict';
import { initialAssessment, clarificationQuestion } from './lib/hybrid-initial-assessment.mjs';
import { estimateHybridCost } from './lib/hybrid-cost.mjs';

const transcript = 'Hello, this is Anna.';
const decision = { action: 'continue', reason: 'unclear', purpose: 'unknown', evidence: '', hasName: true, hasReason: false };
const response = value => ({ status: 'completed', output: [{ type: 'function_call', name: 'screen_call', call_id: 'c', arguments: JSON.stringify(value) }] });
let rounds = 0, rejected = 0;
const assessed = await initialAssessment({ transcript, research: () => assert.fail('unexpected research'),
  diagnose: () => rejected++, respond: async (input, choice) => {
    assert.equal(choice, 'required'); rounds++;
    if (rounds === 1) return response({ ...decision, action: 'approve', evidence: 'invented evidence' });
    assert.equal(JSON.parse(input.at(-1).output).status, 'decision_not_applied');
    return response(decision);
  } });
assert.equal(rounds, 2); assert.equal(rejected, 1); assert.deepEqual(assessed.decision, decision);
assert.equal(JSON.parse(assessed.input.at(-1).output).status, 'continue_screening');
assert.equal(clarificationQuestion(assessed.decision), "What can I tell them it's about?");
assert.equal(clarificationQuestion({ ...decision, hasName: false }), "Who's calling, please?");
assert.equal(clarificationQuestion({ ...decision, hasReason: true }), 'What do you need them to do?');
await assert.rejects(initialAssessment({ transcript, respond: async () => response({ ...decision, action: 'approve', evidence: 'invented' }) }), /initial_repair_limit/);
await assert.rejects(initialAssessment({ transcript, respond: async () => ({ status: 'completed', output: [] }) }), /initial_tool_count/);
assert.throws(() => clarificationQuestion({ ...decision, action: 'approve' }), /question_invalid/);
const usage = { inputTokens: 1000, cachedInputTokens: 200, cacheWriteTokens: 300, outputTokens: 100,
  reasoningTokens: 80, priorityTier: false };
const record = { usage: [usage], liveDurationMs: 30000, sonioxDurationMs: 30000 };
const cost = estimateHybridCost(record);
assert.ok(Math.abs(cost.luna - 0.0001395) < 1e-10, 'cache partitions and reasoning must not be double counted');
assert.ok(Math.abs(cost.total - 0.0261395) < 1e-10);
assert.equal(estimateHybridCost({ ...record, usage: [{ ...usage, priorityTier: true }] }).luna, cost.luna * 2);
assert.equal(estimateHybridCost({ ...record, usage: [] }).warnings.length, 1);
console.log('Hybrid initial assessment and cost checks passed: bounded repair, explicit question, incomplete output, cache partitions and actual tier.');
