// Focused DEVELOPMENT: v74 validation retired at the owner's request to diagnose its failures.
// Inputs and expected outcomes are unchanged. This is not fresh evidence for v75+.
import {cases as validation,stagedCases} from '../holdout/v74-contact-validation.mjs';
import {cases as contact} from './contact-purpose-development.mjs';
import {cases as controls} from './account-control-development.mjs';
import {cases as earlier} from '../holdout/v61-contact-validation.mjs';
import {cases as prior} from '../holdout/v73-contact-validation.mjs';
const ids=new Set(['dev-friend-message','dev-job-requested','control-device-collection','validation-service-employment','final-ordinary-neighbor']);
export const cases=[...validation,...contact,...controls,...earlier,...prior].filter(c=>validation.includes(c)||ids.has(c.name));
export {stagedCases};
export const sourceFiles=['scripts/fixtures/holdout/v74-contact-validation.mjs','scripts/fixtures/redteam/contact-purpose-development.mjs','scripts/fixtures/redteam/account-control-development.mjs','scripts/fixtures/holdout/v61-contact-validation.mjs','scripts/fixtures/holdout/v73-contact-validation.mjs'];
