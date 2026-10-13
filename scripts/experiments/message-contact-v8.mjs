// Offline candidate from voicemail-v7. Development exposed an optional payment
// offer being treated differently from a firm collection request.
export const VOICEMAIL_POLICY_VERSION = '2026-10-13-voicemail-v8-experiment';
export function messageRequest(base) {
  const request = structuredClone(base);
  for (const [from, to] of [
    ['SCAM: Clearly demands ', 'SCAM: Requests '],
    ['payment during the incoming call, unusual payment', 'payment during the incoming call, including an optional offer to collect it, unusual payment'],
  ]) {
    if (!request.instructions.includes(from)) throw new Error('message_v8_source_mismatch');
    request.instructions = request.instructions.replace(from, to);
  }
  return request;
}
