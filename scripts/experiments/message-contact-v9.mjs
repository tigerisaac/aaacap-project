// Align post-call charge handling with the owner's explicit October 13 policy.
// Preserve useful receipts, completed refunds and reports about another caller.
import {messageRequest as paymentRequest} from './message-contact-v8.mjs';
export const VOICEMAIL_POLICY_VERSION='2026-10-13-voicemail-v9-experiment';
export function messageRequest(base){
 const request=paymentRequest(base);
 for(const [from,to] of [
  ['Account/security alerts can be preserved for independent review without trusting the sender.', 'Unexpected-charge alarms are removed before useful-notice checking. Other account/security alerts can be kept unverified.'],
  ['Describing a possible account problem is insufficient.', 'Also an unsolicited unexpected-charge or unauthorized-purchase announcement about her account, even without a demand. A bare charge announcement without expected-purchase or agreed-service context counts. Ordinary receipts, completed refunds, warnings about another caller and a personal caller reporting their own trouble do not. Other account problems alone are insufficient.'],
 ]){if(!request.instructions.includes(from))throw new Error('message_v9_source_mismatch');request.instructions=request.instructions.replace(from,to);}
 return request;
}
