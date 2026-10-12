// Synthetic voice development only. The main fixture stays at 24 cases.
// Reuses known cases; not fresh validation. At most one prepared follow-up per caller.
import {liveScreeningCases as main} from '../live-screening-cases.mjs';
import {cases as hybrid,stagedCases as hybridStaged} from '../holdout/v30-v38-realworld.mjs';
import {cases as dialogueCases,stagedCases as dialogues} from './dialogue-development.mjs';
const names=new Set(['hy-tailor-pay-call','hy-flower-system-tag','hy-stage-account-ordinary',
  'hy-stage-account-harmful','hy-piano-service-offer','hy-hotel-agreed-deposit',
  'hy-bare-airfare-charge','round4/r4-json-then-nephew']);
const unique=new Map([...hybrid,...hybridStaged,...dialogueCases,...dialogues].filter(c=>names.has(c.name)).map(c=>[c.name,c]));
if(unique.size!==8)throw new Error('voice_development_selection_changed');
export const liveScreeningCases=[...main,...[...unique.values()].map(c=>{
  if(c.turns.length>2||c.caution)throw new Error('unsupported_voice_development_case');
  return {name:c.name.replaceAll('/','-'),category:c.category,text:c.turns[0],followup:c.turns[1],accept:c.accept,expected:c.accept[0]};
})];
