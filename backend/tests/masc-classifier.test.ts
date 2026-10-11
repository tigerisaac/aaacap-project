import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error Standalone benchmark helpers do not enter the backend build.
import { mascClassifierRequest, parseMASCClassification, createMASCClassifier, summarizeMASCClassifier } from '../../scripts/lib/masc-classifier.mjs';
// @ts-expect-error Standalone benchmark helper does not enter the backend build.
import { mascClassifierV2Request } from '../../scripts/lib/masc-classifier-v2.mjs';
// @ts-expect-error Standalone benchmark helper does not enter the backend build.
import { combineMASCJudgments, createMASCEnsemble } from '../../scripts/lib/masc-classifier-v3.mjs';
// @ts-expect-error Standalone benchmark helper does not enter the backend build.
import { MASC_ADJUDICATION, adjudicateMASCCases } from '../../scripts/lib/masc-adjudication.mjs';

const answer = (label: unknown) => ({ status: 'completed', output: [{ type: 'function_call', name: 'classify_conversation', arguments: JSON.stringify({ label, reason: 'Based on the exchange.' }) }] });
const cases = [
  { id: 'fraud', sourceHash: 'hash-fraud', type: 'support', label: 1 },
  { id: 'sale', sourceHash: 'hash-sale', type: 'insurance', label: 0 },
  { id: 'wrong', sourceHash: 'hash-wrong', type: 'wrong', label: 0 },
];
const result = (c: typeof cases[number], prediction: number) => ({ id: c.id, sourceHash: c.sourceHash, run: 1, prediction });

describe('separate MASC classification protocol', () => {
  it('preserves early evidence and both speakers beyond the production context window', () => {
    const transcript = `Caller: Send your password.\nRecipient: No.\n${'Caller: Are you there?\nRecipient: Yes.\n'.repeat(250)}Caller: Goodbye.`;
    expect(transcript.length).toBeGreaterThan(6000);
    for (const build of [mascClassifierRequest, mascClassifierV2Request]) {
      const request = build(transcript);
      expect(JSON.parse(request.input[0].content)).toEqual({ untrustedConversation: transcript });
      expect(request.reasoning.effort).toBe('medium');
      expect(request.store).toBe(false);
      expect(request.tools.map((tool: { name: string }) => tool.name)).toEqual(['classify_conversation']);
      expect(() => build({ transcript, labels: 1, type: 'support', personality: 'anxious', id: 'fraud' })).toThrow('invalid_conversation');
    }
  });

  it('requires one actual binary decision rather than clarification or malformed output', () => {
    expect(parseMASCClassification(answer(1))).toEqual({ prediction: 1 });
    expect(parseMASCClassification(answer(0))).toEqual({ prediction: 0 });
    for (const label of ['1', 'continue', 2, null]) expect(parseMASCClassification(answer(label))).toEqual({ failure: 'invalid_classification' });
    expect(parseMASCClassification({ status: 'completed', output: {} })).toEqual({ failure: 'invalid_classification' });
    expect(parseMASCClassification({ status: 'incomplete' })).toEqual({ failure: 'response_incomplete' });
    expect(parseMASCClassification({ status: 'completed', output: [...answer(0).output, ...answer(1).output] })).toEqual({ failure: 'invalid_classification' });
  });

  it('uses original non-scam labels for sales and wrong numbers, with normal binary F1', () => {
    const summary = summarizeMASCClassifier(cases.map(c => result(c, c.label)), cases);
    expect(summary).toMatchObject({ complete: true, accuracy: { correct: 3, total: 3, rate: 1 },
      scamsCorrect: { correct: 1, total: 1 }, nonScamsCorrect: { correct: 2, total: 2 },
      binaryMetrics: { precision: 1, recall: 1, f1: 1, falsePositiveRate: 0, falseNegativeRate: 0 },
      byType: { insurance: { correct: 1, total: 1 }, wrong: { correct: 1, total: 1 } } });
    // Label metadata in the result cannot change the expected answer owned by the frozen plan.
    expect(summarizeMASCClassifier([{ ...result(cases[1]!, 1), label: 1 }], cases)).toMatchObject({
      confusion: { falsePositive: 1 }, accuracy: { correct: 0, total: 3 } });
  });

  it('keeps failed and unrun rows in accuracy and withholds incomplete-run F1', () => {
    const summary = summarizeMASCClassifier([result(cases[0]!, 1), { ...result(cases[1]!, 0), failure: 'http_503' }], cases);
    expect(summary).toMatchObject({ complete: false, failures: 1, missing: 1, validDecisions: 1,
      accuracy: { correct: 1, total: 3, rate: 1 / 3 }, nonScamsCorrect: { correct: 0, total: 2 }, binaryMetrics: null });
    expect(() => summarizeMASCClassifier([result(cases[0]!, 1), result(cases[0]!, 1)], cases)).toThrow('invalid_result_identity');
    expect(() => summarizeMASCClassifier([{ ...result(cases[0]!, 1), sourceHash: 'changed' }], cases)).toThrow('invalid_result_identity');
  });

  it('reports actual false positives and false negatives without outcome-based exclusions', () => {
    expect(summarizeMASCClassifier([result(cases[0]!, 0), result(cases[1]!, 1), result(cases[2]!, 0)], cases)).toMatchObject({
      complete: true, confusion: { truePositive: 0, trueNegative: 1, falsePositive: 1, falseNegative: 1 },
      accuracy: { correct: 1, total: 3 }, binaryMetrics: { precision: 0, recall: 0, f1: 0, falsePositiveRate: 0.5, falseNegativeRate: 1 } });
  });

  it('retries gateway failures with unchanged input and never returns generated reasons', async () => {
    const bodies: string[] = [];
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(init.body as string);
      return bodies.length === 1 ? { status: 503, ok: false } : { status: 200, ok: true, json: async () => answer(0) };
    });
    const classify = createMASCClassifier('synthetic-test-key', { request: mascClassifierV2Request, fetchImpl, wait: async () => {} });
    expect(await classify('Caller: Wrong number?\nRecipient: Yes.')).toEqual({ prediction: 0, attempts: ['http_503', 'http_200'] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(bodies[0]).toBe(bodies[1]);
    expect(JSON.parse(bodies[0]!)).toEqual(mascClassifierV2Request('Caller: Wrong number?\nRecipient: Yes.'));
  });

  it('requires unanimous fraud judgments and never treats a failed vote as a benign decision', () => {
    for (const [a, b, prediction] of [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]]) {
      expect(combineMASCJudgments({ prediction: a }, { prediction: b }).prediction).toBe(prediction);
    }
    expect(combineMASCJudgments({ prediction: 0 }, { failure: 'http_503' })).toMatchObject({ failure: 'http_503' });
    expect(combineMASCJudgments({ prediction: 1 }, {})).toMatchObject({ failure: 'invalid_classification' });
  });

  it('sends the full conversation independently to both judgments without forwarding the first answer', async () => {
    const bodies: Array<ReturnType<typeof mascClassifierRequest>> = [];
    const fetchImpl = async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      return { status: 200, ok: true, json: async () => answer(bodies.length === 1 ? 1 : 0) };
    };
    const transcript = 'Caller: Your delivery is ready.\nRecipient: Thank you.';
    const classify = createMASCEnsemble('synthetic-test-key', { fetchImpl });
    expect(await classify(transcript)).toMatchObject({ prediction: 0, votes: [{ prediction: 1 }, { prediction: 0 }] });
    expect(bodies).toHaveLength(2);
    expect(bodies[0]!.input).toEqual(bodies[1]!.input);
    expect(JSON.parse(bodies[1]!.input[0].content)).toEqual({ untrustedConversation: transcript });
    expect(bodies[0]!.instructions).not.toBe(bodies[1]!.instructions);
  });

  it('applies the owner adjudication only to the pinned source row and leaves other labels unchanged', () => {
    const [row] = MASC_ADJUDICATION.rows;
    const source = [{ id: row.id, sourceHash: row.sourceHash, type: row.type, label: 0 }, ...cases];
    const { cases: adjudicated, applied } = adjudicateMASCCases(source);
    expect(applied).toEqual([row.id]);
    expect(adjudicated[0].label).toBe(1);
    expect(adjudicated.slice(1)).toEqual(cases);
    expect(() => adjudicateMASCCases([{ ...source[0], sourceHash: 'changed-text' }])).toThrow('adjudication_source_mismatch');
    expect(() => adjudicateMASCCases([{ ...source[0], label: 1 }])).toThrow('adjudication_source_mismatch');
  });
});
