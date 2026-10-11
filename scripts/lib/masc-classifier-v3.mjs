// Precision-oriented benchmark ensemble. The same rule applies to every conversation.
import { createMASCClassifier, mascClassifierRequest } from './masc-classifier.mjs';
import { mascClassifierV2Request } from './masc-classifier-v2.mjs';

export const MASC_CLASSIFIER_V3_VERSION = '2026-10-11-masc-classifier-v3-unanimous';
export const mascEnsembleProtocol = transcript => ({
  requests: [mascClassifierRequest(transcript), mascClassifierV2Request(transcript)],
  reduction: 'Scam only if both independent judgments return 1; otherwise non-scam. Either failed judgment fails the check.',
});

export function combineMASCJudgments(first, second) {
  const votes = [first, second].map((vote, i) => ({ version: i === 0 ? 'v1' : 'v2', ...vote }));
  const failed = votes.find(vote => vote.failure || ![0, 1].includes(vote.prediction));
  if (failed) return { failure: failed.failure ?? 'invalid_classification', votes };
  return { prediction: votes.every(vote => vote.prediction === 1) ? 1 : 0, votes };
}

export function createMASCEnsemble(key, options = {}) {
  const first = createMASCClassifier(key, { ...options, request: mascClassifierRequest });
  const second = createMASCClassifier(key, { ...options, request: mascClassifierV2Request });
  return async transcript => {
    const a = await first(transcript);
    // A failed first judgment cannot earn a classification; do not spend a second request on it.
    if (a.failure) return { failure: a.failure, votes: [{ version: 'v1', ...a }] };
    // The second judgment sees the original conversation only, not the first answer or reason.
    return combineMASCJudgments(a, await second(transcript));
  };
}
