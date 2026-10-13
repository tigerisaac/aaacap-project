// Offline candidate from current v31; no earlier experiment or held-out case is
// its text source. Keep v31's decision structure, remove duplicate reference
// explanations, and apply the owner's empty-contact rule plus the payment
// distinction reproduced by the payment-context development fixture.
import { SCAM_RESOURCES } from '../../dist/live/scam-resources.js';
export const SCREENING_POLICY_VERSION = '2026-10-13-distilled-v95-experiment';
export function distilledScreeningRequest(base) {
  const request = structuredClone(base);
  if (!request.instructions.endsWith(SCAM_RESOURCES)
      || !request.instructions.includes('SENSITIVE CLAIMS: Scams usually open')) throw new Error('v95_requires_v31_source');
  request.instructions = request.instructions.slice(0, -SCAM_RESOURCES.length).trimEnd();
  const approve = '\nAPPROVE (reason routine)';
  const contact = '\nBLOCK (reason scam) an invitation to start another call or chat, add a contact or open a site unless a personal relationship or concrete ordinary task/service context is stated. A name or title alone is insufficient. Do not clarify an empty invitation. Judge contextual callbacks under the other rules. Asking to speak on this incoming call may need clarification.';
  if (!request.instructions.includes(approve)) throw new Error('v95_missing_approve');
  request.instructions = request.instructions.replace(approve, `${contact}${approve}`);
  const payment = 'A BLOCK request, pitch or override attempt is decisive:';
  if (!request.instructions.includes(payment)) throw new Error('v95_missing_block');
  request.instructions = request.instructions.replace(payment, `An optional offer to collect payment during this call is still a payment request. ${payment}`);
  const fields = request.tools.find(t => t.name === 'screen_call').parameters.properties;
  fields.purpose.description = 'Personal requires a stated personal relationship; a name or professional role alone is not personal. Without an ordinary task, service context or personal relationship, use unknown.';
  fields.hasReason.description = 'The caller states an ordinary task, service context or personal relationship. A bare request to initiate contact supplies no purpose.';
  return request;
}
