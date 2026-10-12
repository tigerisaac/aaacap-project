// Development only: owner requested debugging of these retired probes and known MASC misses.
// Public synthetic transcripts are loaded from the ignored cache, never copied into source.
import {readFile} from 'node:fs/promises';
import {cases as retiredCases,stagedCases} from '../holdout/v30-v38-realworld.mjs';
import {MASC,parseCSV,mascCase} from '../../lib/public-scam-benchmark.mjs';
const all=parseCSV(await readFile(new URL(`../../../artifacts/public-benchmarks/masc-${MASC.revision}.csv`,import.meta.url),'utf8')).map(mascCase);
export const cases=[...retiredCases,...[24,61,75,184].map(id=>{
  const c=all.find(c=>c.id===`masc-test-${id}`);
  return {name:`dev-${c.id}`,category:c.label?'scam':'legit',focus:'known-masc-miss',turns:[c.callerText],accept:c.label?['block','hold']:['approve']};
})];
export {stagedCases};
