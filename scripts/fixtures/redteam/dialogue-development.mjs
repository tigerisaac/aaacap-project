// Known development conversations. Native-history checks supplement stateless snapshots.
import {stagedCases as regression,sourceFiles as regressionSources} from './screening-regression.mjs';
import {stagedCases as hybrid} from '../holdout/v30-v38-realworld.mjs';
export const sourceFiles=[...regressionSources,'scripts/fixtures/redteam/screening-regression.mjs','scripts/fixtures/holdout/v30-v38-realworld.mjs'];
export const cases=[];
export const stagedCases=[...regression,...hybrid];
