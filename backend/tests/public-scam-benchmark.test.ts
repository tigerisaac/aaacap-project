import { describe, expect, it } from 'vitest';
// @ts-expect-error Evaluation helpers are standalone JS, outside the backend build.
import { parseCSV, mascCase, summarizeMASC } from '../../scripts/lib/public-scam-benchmark.mjs';

describe('public synthetic benchmark import', () => {
  it('keeps missing decisions visible in diagnostic groups, independently of coded failures', () => {
    const rows = [
      { label: 0, type: 'appointment', screening: { actual: 'approve' } },
      { label: 0, type: 'wrong', screening: { actual: 'no_decision' }, monitor: { actual: 'no_decision' } },
      { label: 1, type: 'refund', screening: { actual: 'no_decision', failure: 'too_many_rounds' } },
    ];
    expect(summarizeMASC(rows)).toMatchObject({
      noDecisions: 2, evaluationFailures: 1, validationFailures: 1, providerFailures: 0,
      legitimateOffered: { passed: 1, total: 1 }, harmfulStopped: { passed: 0, total: 1 },
      scamsIdentified: { passed: 0, total: 1 }, separateGroups: { wrongNumbers: 1, ads: 0 },
    });
  });
  it('reports subscription failures separately from invalid model behavior without crediting either', () => {
    const failures = ['codex_evaluation_timeout', 'codex_thread_start_failed', 'codex_pipe_closed', 'codex_turn_failed',
      'too_many_rounds', 'unexpected_tool', 'invalid_assessment'];
    const rows = failures.map(failure => ({ label: 1, type: 'refund', screening: { actual: 'block', failure } }));
    expect(summarizeMASC(rows)).toMatchObject({
      evaluationFailures: 7, providerFailures: 4, validationFailures: 3,
      harmfulStopped: { passed: 0, total: 7 }, scamsIdentified: { passed: 0, total: 7 },
      harmfulApproved: 0, harmfulSavedUnverified: 0,
    });
  });
  it('separates saved notices and never credits failed screening or monitoring outcomes', () => {
    const rows = [
      { label: 0, type: 'appointment', screening: { actual: 'message' } },
      { label: 1, type: 'refund', screening: { actual: 'message' } },
      { label: 0, type: 'delivery', screening: { actual: 'approve', failure: 'mock_failure' }, monitor: { actual: 'continue', failure: 'mock_failure' } },
      { label: 0, type: 'insurance', screening: { actual: 'block', failure: 'mock_failure' } },
      { label: 1, type: 'support', screening: { actual: 'approve', failure: 'mock_failure' }, monitor: { actual: 'intervene', failure: 'mock_failure' } },
    ];
    expect(summarizeMASC(rows)).toMatchObject({
      legitimateOffered: { passed: 0, total: 2 }, legitimateSaved: { passed: 1, total: 2 },
      harmfulSavedUnverified: 1, harmfulApproved: 0, harmfulStopped: { passed: 0, total: 2 }, scamsIdentified: { passed: 0, total: 2 },
      adsBlocked: { passed: 0, total: 1 }, ordinaryConversationsKept: { passed: 0, total: 1 },
      labeledScamStopped: { passed: 0, total: 1 }, evaluationFailures: 3,
    });
  });
  it('preserves multiline dialogues and escaped quotes without shifting labels', () => {
    const csv = '\uFEFFdialogue,type,labels\r\n"Suspect: Hi, I said ""hello"".\nInnocent: Hi.",appointment,0\r\n';
    expect(parseCSV(csv)).toEqual([{ dialogue: 'Suspect: Hi, I said "hello".\nInnocent: Hi.', type: 'appointment', labels: '0' }]);
    expect(() => parseCSV('a,b\n"unterminated,b')).toThrow('unterminated_csv_quote');
    expect(() => parseCSV('a,b\n1,2,3')).toThrow('invalid_csv_row');
  });
  it('keeps receiver speech out of screening and dataset labels out of model text', () => {
    const c = mascCase({ dialogue: 'Innocent: Hello. Suspect: My name is Sam. Innocent: A scammer asked for a code. Suspect: Your appointment is tomorrow.', labels: '0', type: 'appointment', personality: 'anxious' }, 3);
    expect(c.callerText).toBe('My name is Sam. Your appointment is tomorrow.');
    expect(c.transcript).toBe('Recipient: Hello.\nCaller: My name is Sam.\nRecipient: A scammer asked for a code.\nCaller: Your appointment is tomorrow.');
    expect(c.screeningGroup).toBe('legitimate');
    expect(c.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it('reports non-scam sales as policy differences and rejects unknown labels or roles', () => {
    const row = { dialogue: 'Innocent: Hello. Suspect: I sell insurance.', labels: '0', type: 'insurance' };
    expect(mascCase(row, 0).screeningGroup).toBe('policy_difference');
    expect(() => mascCase({ ...row, labels: '2' }, 0)).toThrow('invalid_masc_row');
    expect(() => mascCase({ ...row, dialogue: 'Caller: hi' }, 0)).toThrow('invalid_dialogue_roles');
    expect(() => mascCase({ ...row, dialogue: 'Suspect: hi' }, 0)).toThrow('missing_dialogue_role');
  });
  it('scores ads separately and keeps failed scam checks in the denominator', () => {
    const rows = [
      { label: 0, type: 'appointment', screening: { actual: 'approve' }, monitor: { actual: 'continue' } },
      { label: 0, type: 'delivery', screening: { actual: 'approve' }, monitor: { actual: 'intervene' } },
      { label: 0, type: 'insurance', screening: { actual: 'block' }, monitor: { actual: 'intervene' } },
      { label: 0, type: 'wrong', screening: { actual: 'hold' }, monitor: { actual: 'continue' } },
      { label: 1, type: 'refund', screening: { actual: 'block' }, monitor: { actual: 'intervene' } },
      { label: 1, type: 'support', screening: { actual: 'continue', questions: 1 }, monitor: { actual: 'continue' } },
      { label: 1, type: 'ssn', screening: { actual: 'failure', failure: 'transport_unavailable' }, monitor: { actual: 'failure', failure: 'unsupported_intervention' } },
    ];
    expect(summarizeMASC(rows)).toMatchObject({
      legitimateOffered: { passed: 2, total: 2 }, harmfulStopped: { passed: 1, total: 3 }, harmfulApproved: 0,
      scamsIdentified: { passed: 2, total: 3 },
      harmfulClarifications: 1, adsBlocked: { passed: 1, total: 1 }, ordinaryConversationsKept: { passed: 1, total: 2 },
      labeledScamStopped: { passed: 1, total: 3 }, separateGroups: { ads: 1, wrongNumbers: 1 },
      evaluationFailures: 1, providerFailures: 1, validationFailures: 1,
    });
  });
  it('credits genuine clarification without crediting approvals, absent questions or failures', () => {
    const screening = [
      { actual: 'block' }, { actual: 'hold' }, { actual: 'continue', questions: 1 },
      { actual: 'approve' }, { actual: 'no_decision' }, { actual: 'continue', questions: 0 },
      { actual: 'continue', questions: 1, failure: 'transport_unavailable' },
    ];
    expect(summarizeMASC(screening.map(result => ({ label: 1, type: 'refund', screening: result })))).toMatchObject({
      scamsIdentified: { passed: 3, total: 7 }, harmfulStopped: { passed: 2, total: 7 },
      harmfulApproved: 1, harmfulClarifications: 1, evaluationFailures: 1, providerFailures: 1, noDecisions: 1,
    });
  });
});
