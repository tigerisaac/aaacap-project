// Offline direct-decision alternative to the observation classifier. Start from
// v84's ordinary-call/contact distinction; align saved notices with the owner's
// latest charge-alarm instruction. Freeze before inspecting fresh outcomes.
import {instructions as priorInstructions,distilledScreeningRequest as priorRequest} from './distilled-screening-v84.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-distilled-v124-experiment';
export const instructions=priorInstructions
 .replace('offer, block, clarify or hold for voicemail.', 'offer, block, clarify, hold for voicemail or save a notice.')
 .replace('installing software, remote device access,', 'installing software, running supplied commands, remote device access,')
 .replace('Collecting an agreed payment for existing service during this call still requires BLOCK.', 'Collecting or offering to collect an agreed payment for existing service during this call still requires BLOCK.')
 .replace('unexplained-charge, unauthorized-transaction or account-compromise alarm', 'unexpected-charge or unauthorized-transaction alarm')
 .replace('This overrides ordinary approval and clarification.', 'This overrides approval, clarification and notice saving.')
 .replace('So is an alert that only suggests independent review later through an app or contact channel she already has, without further interaction with the caller. Explicit instructions to hang up are unnecessary; harmful requests still override.', 'The charge-alarm rule still applies if the caller suggests independent review. Other account-security claims follow clarification or notice saving, unless a block rule applies.')
 .replace('Use robocall for recorded pitches or automated alarming messages soliciting a keypress or callback. Routine automated service notices are allowed.', 'Use robocall for recorded pitches. Automation, a keypress or callback alone does not establish fraud.')
 .replace('\n\nAPPROVE a clear ordinary purpose', '\n\nMESSAGE saves a potentially useful prerecorded notice without ringing the recipient, after all block rules. Preserve ordinary receipts, completed refunds, service updates and other uncertain notices as unverified information. Unexpected-charge alarms, harmful requests, pitches and empty contact invitations still block. Do not question recordings or ask them to repeat. A live caller reporting another recording is judged on their own purpose.\n\nAPPROVE a clear ordinary purpose')
 .replace('Separate contact asks the recipient to start another call or chat, add a contact or open a site.', 'Separate contact asks the recipient to initiate communication outside this call, by any medium, or add a contact or open a site.')
 .replace('routine for approval, and unclear for hold/continue.', 'routine for approval, unclear for hold/continue, and routine or unclear for message.')
 .replace('For approve, block or hold,', 'For approve, block, hold or message,');
export function distilledScreeningRequest(base){
 const request=priorRequest(base),caution=base.instructions.match(/RECENT SCAM:[^\n]*\n\n/)?.[0]??'';
 request.instructions=caution?`${instructions}\n\n${caution.trimEnd()}`:instructions;
 return request;
}
