// Development union. V61 validation was retired after inspecting its failures.
// Do not describe this union or the v61 validation cases as fresh evidence for v72+.
import {cases as a,stagedCases as b} from './contact-general-development.mjs';
import {cases as c,stagedCases as d} from '../holdout/v61-contact-validation.mjs';
export const cases=[...a,...c];
export const stagedCases=[...b,...d];
export const sourceFiles=['scripts/fixtures/redteam/contact-purpose-development.mjs','scripts/fixtures/redteam/account-control-development.mjs','scripts/fixtures/holdout/v61-contact-validation.mjs'];
