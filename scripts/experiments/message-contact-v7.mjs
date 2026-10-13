// Offline candidate: same policy as v6, with a capitalization repair only.
// No public or held-out outcomes supplied a new rule.
import { messageRequest as v6Request } from './message-contact-v6.mjs';
export const VOICEMAIL_POLICY_VERSION = '2026-10-13-voicemail-v7-experiment';
export function messageRequest(base) {
  const request = v6Request(base);
  if (!request.instructions.includes('Also Clearly unsolicited')) throw new Error('message_v7_source_mismatch');
  request.instructions = request.instructions.replace('Also Clearly unsolicited', 'Also clearly unsolicited');
  return request;
}
