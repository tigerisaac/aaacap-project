import type { LiveDecision } from './policy.js';

/** Punctuation/spacing corrections do not answer a pending screening question. */
export const spokenLength = (text: string) => text.replace(/[^\p{L}\p{N}]+/gu, '').length;

/** Do not replace an unanswered clarification with another routine decision. */
export function awaitingCallerAnswer(decision: LiveDecision, clarifiedAt: number | undefined, spoken: number) {
  return clarifiedAt !== undefined && spoken <= clarifiedAt
    && !(decision.action === 'block' && decision.reason === 'scam');
}

export const CALLER_ANSWER_PENDING = {
  status: 'awaiting_caller_answer',
  instruction: 'The requested clarification has no new caller answer. Ask the pending question briefly, then wait for new caller information. Do not announce connection or rejection.'
} as const;
