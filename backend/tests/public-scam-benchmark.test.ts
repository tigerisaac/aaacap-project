import { describe, expect, it } from 'vitest';
// @ts-expect-error Evaluation helpers are standalone JS, outside the backend build.
import { parseCSV, mascCase } from '../../scripts/lib/public-scam-benchmark.mjs';

describe('public synthetic benchmark import', () => {
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
});
