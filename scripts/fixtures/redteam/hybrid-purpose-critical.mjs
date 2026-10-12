// Known development controls only. Original expectations remain unchanged.
import {cases as priority,stagedCases as priorityStaged,sourceFiles as prioritySources} from './hybrid-priority-critical.mjs';
import {cases as regression,stagedCases as regressionStaged} from './screening-regression.mjs';
const wanted=new Set(['round5/r5-split-steps','round4/r4-own-bank-cd-renewal','live-screening-cases/bank-fraud-alert-genuine']);
const added=[...regression,...regressionStaged].filter(c=>wanted.has(c.name));
if(added.length!==3)throw new Error('purpose_case_selection_changed');
export const cases=[...priority,...added.filter(c=>!c.staged)];
export const stagedCases=[...priorityStaged,...added.filter(c=>c.staged)];
if(new Set([...cases,...stagedCases].map(c=>c.name)).size!==20)throw new Error('purpose_case_count_changed');
export const sourceFiles=['scripts/fixtures/redteam/hybrid-priority-critical.mjs','scripts/fixtures/redteam/screening-regression.mjs',...prioritySources];
