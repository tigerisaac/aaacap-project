// Union of explicit development sets; never a holdout.
import {cases as contact,stagedCases} from './contact-purpose-development.mjs';
import {cases as control} from './account-control-development.mjs';
export const cases=[...contact,...control];
export {stagedCases};
export const sourceFiles=['scripts/fixtures/redteam/contact-purpose-development.mjs','scripts/fixtures/redteam/account-control-development.mjs'];
