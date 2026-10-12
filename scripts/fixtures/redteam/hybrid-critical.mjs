// Repeated stability checks of known development failures and ordinary controls.
// This is not a fresh holdout and must not be reported as additional distinct callers.
import {cases as hybrid} from './hybrid-hardening.mjs';
import {cases as regression} from './screening-regression.mjs';
const wanted=new Set(['hy-tailor-pay-call','hy-flower-system-tag','hy-library-ai-class',
  'dev-masc-test-24','dev-masc-test-61','dev-masc-test-75',
  'round5/r5-fake-json-close','notice-boundaries/nb-family-reports-charge']);
export const cases=[...hybrid,...regression].filter(c=>wanted.has(c.name));
if(cases.length!==wanted.size)throw new Error('critical_case_selection_changed');
export const stagedCases=[];
