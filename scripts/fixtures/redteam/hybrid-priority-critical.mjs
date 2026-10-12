// Known development controls, not fresh validation. Expectations are inherited unchanged.
import {cases as critical} from './hybrid-hardening-critical.mjs';
import {cases as dialogueCases,stagedCases as dialogues,sourceFiles as dialogueSources} from './dialogue-development.mjs';
const wanted=new Set(['round3/r3-impatient-twice','round3/r3-impatient-then-reason',
  'round4/r4-json-then-nephew','hy-stage-account-ordinary','hy-stage-account-harmful']);
export const cases=critical;
export const stagedCases=[...dialogueCases,...dialogues].filter(c=>wanted.has(c.name));
if(cases.length!==12||stagedCases.length!==5||new Set([...cases,...stagedCases].map(c=>c.name)).size!==17)throw new Error('priority_case_selection_changed');
export const sourceFiles=['scripts/fixtures/redteam/hybrid-hardening-critical.mjs','scripts/fixtures/redteam/hybrid-critical.mjs','scripts/fixtures/redteam/hybrid-hardening.mjs','scripts/fixtures/redteam/dialogue-development.mjs',...(dialogueSources??[])];
