// Known development stability checks: payment, system trust, ordinary callers and missing purpose.
// Never report these repeated inputs as fresh or independent callers.
import {cases as critical} from './hybrid-critical.mjs';
import {cases as hybrid} from './hybrid-hardening.mjs';
import {cases as regression,stagedCases as regressionStaged} from './screening-regression.mjs';
const wanted=new Set(['hy-role-no-purpose','hy-name-no-purpose',
  'round1/b-admin-whitelist','round2/r2-friend-on-her-list']);
export const cases=[...critical,...[...hybrid,...regression,...regressionStaged].filter(c=>wanted.has(c.name))];
if(cases.length!==12||new Set(cases.map(c=>c.name)).size!==12)throw new Error('critical_case_selection_changed');
export const stagedCases=[];
