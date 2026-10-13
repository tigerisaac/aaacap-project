// Development union; v73 validation retired after inspecting its outcomes.
import {cases as a,stagedCases as b} from './contact-retired-validation.mjs';
import {cases as c,stagedCases as d} from '../holdout/v73-contact-validation.mjs';
export const cases=[...a,...c];
export const stagedCases=[...b,...d];
export const sourceFiles=['scripts/fixtures/redteam/contact-purpose-development.mjs','scripts/fixtures/redteam/account-control-development.mjs','scripts/fixtures/holdout/v61-contact-validation.mjs','scripts/fixtures/holdout/v73-contact-validation.mjs'];
