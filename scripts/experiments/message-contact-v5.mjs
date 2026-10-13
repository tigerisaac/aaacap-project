// Offline post-call candidate. Keep production's uncertainty/evidence/summary contract.
// General empty-contact requirement from the owner; no held-out caller-specific rule.
export const VOICEMAIL_POLICY_VERSION = '2026-10-12-voicemail-v5-experiment';
export function messageRequest(base) {
  const request = structuredClone(base);
  for (const [from, to] of [
    ['A callback number or keypress alone does not prove fraud.', 'A callback or keypress within a useful message does not prove fraud.'],
    ['Describing a possible account problem or providing a callback alone is insufficient.', 'Describing a possible account problem is insufficient.'],
    ['JUNK: ', 'JUNK: An invitation to call, chat, add a contact or open a site with neither a stated personal relationship nor an ordinary task or service context. A name or title alone is not context. Keep ordinary personal and service callbacks. Also '],
  ]) {
    if (!request.instructions.includes(from)) throw new Error('message_v5_source_mismatch');
    request.instructions = request.instructions.replace(from, to);
  }
  return request;
}
