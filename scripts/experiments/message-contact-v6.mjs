// Offline post-call candidate. Keep production's uncertainty/evidence/summary contract.
// Clarifies the owner's stated-context rule against the legacy unnamed-callback control.
export const VOICEMAIL_POLICY_VERSION = '2026-10-12-voicemail-v6-experiment';
export function messageRequest(base) {
  const request = structuredClone(base);
  for (const [from, to] of [
    ['A callback number or keypress alone does not prove fraud.', 'A callback or keypress within a useful message does not prove fraud.'],
    ['Describing a possible account problem or providing a callback alone is insufficient.', 'Describing a possible account problem is insufficient.'],
    ['JUNK: ', 'JUNK: A bare invitation to call, chat, add a contact or open a site unless a personal relationship or ordinary task/service context is actually stated. A name, title or implied familiarity alone is not context. Empty contact is not useful uncertainty. Also '],
  ]) {
    if (!request.instructions.includes(from)) throw new Error('message_v6_source_mismatch');
    request.instructions = request.instructions.replace(from, to);
  }
  return request;
}
