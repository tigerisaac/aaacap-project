// Development-only correction: v124 inferred recording from an ordinary live
// billing update. The message action needs an actual recording cue. No fresh or
// public wording supplies this instruction; all v124 outcomes remain retained.
import {instructions as previous,distilledScreeningRequest as priorRequest} from './distilled-screening-v124.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-distilled-v125-experiment';
export const instructions=previous.replace('MESSAGE saves a potentially useful prerecorded notice', 'A message is prerecorded only when it identifies itself as recorded/automated or operates a playback/keypad menu; informative wording alone is insufficient. MESSAGE saves a potentially useful prerecorded notice');
export function distilledScreeningRequest(base){const request=priorRequest(base),caution=base.instructions.match(/RECENT SCAM:[^\n]*\n\n/)?.[0]??'';request.instructions=caution?`${instructions}\n\n${caution.trimEnd()}`:instructions;return request;}
