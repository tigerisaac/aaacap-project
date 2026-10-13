// Owner-requested diagnosis retires v79 validation into DEVELOPMENT. Original labels unchanged.
// Reuses the previously reported ordinary misses; public FTC 858 remains outside this synthetic suite.
import {cases as prior,stagedCases} from '../holdout/v79-contact-repair-validation.mjs';
import {cases as older} from './v74-repair-development.mjs';
const retain=new Set(['v74-ordinary-pickup','validation-service-employment','v74-empty-spanish','v74-empty-return']);
export const cases=[...prior,...older.filter(c=>retain.has(c.name))];
export {stagedCases};
export const sourceFiles=['scripts/fixtures/holdout/v79-contact-repair-validation.mjs','scripts/fixtures/redteam/v74-repair-development.mjs','scripts/fixtures/holdout/v74-contact-validation.mjs','scripts/fixtures/redteam/contact-purpose-development.mjs','scripts/fixtures/redteam/account-control-development.mjs','scripts/fixtures/holdout/v61-contact-validation.mjs','scripts/fixtures/holdout/v73-contact-validation.mjs'];
