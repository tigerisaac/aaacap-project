// Post-call restricted conduct matches the screening policy's access category.
import {messageRequest as previousRequest} from './message-contact-v9.mjs';
export const VOICEMAIL_POLICY_VERSION='2026-10-13-voicemail-v10-experiment';
export function messageRequest(base){
 const request=previousRequest(base),from='identity numbers, remote access, secrecy',to='identity numbers, software installation, supplied commands, remote access or account permissions, secrecy';
 if(!request.instructions.includes(from))throw new Error('message_v10_source_mismatch');
 request.instructions=request.instructions.replace(from,to);return request;
}
