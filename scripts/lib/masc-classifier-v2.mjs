// Independent benchmark adaptation: require evidence of deception rather than privacy risk alone.
import { mascClassifierRequest } from './masc-classifier.mjs';

export const MASC_CLASSIFIER_V2_VERSION = '2026-10-11-masc-classifier-v2';
export function mascClassifierV2Request(transcript) {
  const request = mascClassifierRequest(transcript);
  request.instructions += `

Fraud and privacy risk are different judgments. Classify the actual deceptive scheme, not whether sharing the requested information would be safe. An intrusive question, an identity field, an unsolicited sales call, an unverifiable business identity, or poor security practice alone does not establish a scam. Ordinary delivery coordination, quotations and applications can request contact, demographic or identity information without a fraudulent pretext. A recipient's suspicion is evidence to consider, not a ground-truth label.

For label 1, identify affirmative conversational evidence of a deceptive scheme: a fabricated threat or entitlement, impersonation used for account takeover, an implausible payment or access mechanism, extortion, or a materially inconsistent pretext. Infer the scheme from the full exchange when it is present, even if the recipient refuses. When the caller only describes an ordinary service or commercial transaction and the conversation provides no affirmative evidence of deception, use label 0 despite privacy concerns. Apply the same distinction to every topic; a business or service category alone never determines the label.`;
  return request;
}
