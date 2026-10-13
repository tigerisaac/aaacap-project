// Offline synthetic-only experiment. Model observes facts; a frozen deterministic
// mapper chooses the existing decision, which still passes production validation.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {evaluateWithQuestions} from './check-screening-synthetic-questions.mjs';
import {summarizeDialogues} from './check-screening-dialogues.mjs';
import {digest} from './lib/public-scam-benchmark.mjs';
import {liveSessionConfig,permittedDecision} from '../dist/live/policy.js';
import * as v102 from './experiments/observed-screening-v102.mjs';
import * as v103 from './experiments/observed-screening-v103.mjs';
import * as v104 from './experiments/observed-screening-v104.mjs';
const policyIndex=process.argv.indexOf('--policy');
const policy=policyIndex<0?'v102':process.argv.splice(policyIndex,2)[1];
assert.ok(['v102','v103','v104'].includes(policy));
const selected={v102,v103,v104}[policy];
const {factsSchema,observedScreeningRequest,interpretFacts,SCREENING_POLICY_VERSION}=selected;

if(process.argv.includes('--self-test')&&policy!=='v102') {
  selected.selfTest();
} else if(process.argv.includes('--self-test')) {
  const base={who:true,context:'task',separateContact:false,promotion:false,prohibited:'none',recorded:false,unresolvedClaim:false,refuses:false,purpose:'other',evidence:'An ordinary task.'};
  let checks=0;
  for(const context of ['personal','task','missing'])for(const recorded of [false,true])for(const prohibited of ['secrets','payment','access','concealment','financial_bait','threat','override']){
    const d=interpretFacts({...base,context,recorded,prohibited},base.evidence,{questions:0});assert.equal(d.action,'block');assert.ok(permittedDecision(d,base.evidence));checks++;
  }
  for(const recorded of [false,true]){
    assert.equal(interpretFacts({...base,context:'missing',separateContact:true,recorded},'',{questions:0}).action,'block');
    assert.equal(interpretFacts({...base,context:'missing',promotion:true,recorded},'',{questions:0}).action,'block');
    assert.equal(interpretFacts({...base,promotion:true,recorded},'',{questions:0}).action,recorded?'message':'approve');checks+=3;
  }
  assert.equal(interpretFacts({...base,context:'missing'},'',{questions:0}).action,'continue');
  assert.equal(interpretFacts({...base,context:'missing'},'',{questions:2}).action,'hold');
  assert.equal(interpretFacts({...base,unresolvedClaim:true},'',{questions:0}).action,'continue');
  assert.equal(interpretFacts({...base,unresolvedClaim:true},'',{questions:1}).action,'hold');
  assert.equal(interpretFacts({...base,unresolvedClaim:true,recorded:true},'',{questions:0}).action,'message');
  assert.equal(interpretFacts({...base,who:false},'',{questions:0}).action,'continue');
  assert.equal(interpretFacts({...base,context:'missing',refuses:true},'',{questions:0}).action,'hold');
  assert.equal(interpretFacts({...base,untrustedExtra:true},'',{questions:0}),undefined);
  assert.equal(permittedDecision(interpretFacts({...base,evidence:'Invented text.'},'',{questions:0}),base.evidence),undefined);
  assert.throws(()=>observedScreeningRequest(liveSessionConfig({recentScamStopped:true}).delegation.responses),/caution_not_implemented/);
  console.log(JSON.stringify({passed:true,checks:checks+10,scope:'Mapper priority, ordinary service, limits, strict fields, evidence and unsupported caution; no inference.'}));
} else {
  const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args.splice(i,2)[1];};
  const fixtureFile=option('--cases'),out=option('--out'),repeat=Number(option('--repeat','1')),concurrency=Number(option('--concurrency','2'));
  assert.ok(!args.length&&fixtureFile&&out);assert.ok(Number.isInteger(repeat)&&repeat>0&&repeat<=5);assert.ok(Number.isInteger(concurrency)&&concurrency>0&&concurrency<=6);
  const fixture=await import(pathToFileURL(resolve(fixtureFile)).href);assert.equal(fixture.synthetic,true);
  const cases=[...(fixture.cases??[]),...(fixture.stagedCases??[])];assert.ok(cases.length);assert.ok(policy!=='v102'||cases.every(c=>!c.caution));
  const request=observedScreeningRequest(liveSessionConfig().delegation.responses),files=[fixtureFile,...(fixture.sourceFiles??[]),'scripts/check-screening-observations.mjs','scripts/experiments/observed-screening-v102.mjs','scripts/experiments/observed-screening-v103.mjs','scripts/experiments/observed-screening-v104.mjs','scripts/lib/codex-screening-target.mjs','scripts/check-screening-dialogues.mjs','scripts/check-screening-synthetic-questions.mjs','scripts/check-screening-subscription-dialogue.mjs','scripts/lib/screening-codex-models.json','backend/src/live/policy.ts','backend/src/live/decision-progress.ts','dist/live/policy.js','dist/live/evidence.js','dist/live/decision-progress.js'];
  const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,digest(await readFile(p))]))),sourceHashes=await hashes();
  await mkdir(out,{recursive:true});await writeFile(`${out}/request.json`,JSON.stringify(request,null,2),{flag:'wx'});await writeFile(`${out}/results.jsonl`,'',{flag:'wx'});
  const target=await codexScreeningTarget(request,{conversation:true,interpretDecision:(raw,transcript,state)=>{
    const parsed=factsSchema.safeParse(raw),decision=interpretFacts(raw,transcript,state,{caution:state.caution});
    if(parsed.success){const {evidence,...facts}=parsed.data;state.factObservations.push({facts,mappedAction:decision?.action,questionCount:state.questions});}
    else state.factObservations.push({invalidFacts:true});
    return decision;
  }});
  const jobs=Array.from({length:repeat},(_,i)=>cases.map(c=>({c,run:i+1}))).flat(),rows=[];
  const manifest={startedAt:new Date().toISOString(),policyVersion:SCREENING_POLICY_VERSION,provider:'codex',model:'gpt-6-luna',effort:'medium',transport:target.transport,sourceHashes,requestHash:digest(JSON.stringify(request)),instructionChars:request.instructions.length,toolChars:JSON.stringify(request.tools).length,repeat,concurrency,planned:jobs.length,cases:cases.map(c=>({name:c.name,category:c.category,focus:c.focus,accept:c.accept,caution:!!c.caution,expectedSteps:c.expectedSteps,inputHash:digest(JSON.stringify(c.turns))})),interpretation:`Synthetic offline experiment. Facts have no caller quotes in saved output. Expected labels and prepared future replies are never model input. Native questions use the existing bounded adapter. Recent-call caution ${policy!=='v102'?'uses trusted application state in the mapper':'is explicitly unsupported'}. Production is unchanged.`};
  await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
  let cursor=0,stopped=false,writes=Promise.resolve();
  try {
    async function worker(){while(!stopped&&cursor<jobs.length){const {c,run}=jobs[cursor++],factObservations=[],observed={...target,newState:transcript=>{const s=target.newState(transcript);s.factObservations=factObservations;s.caution=!!c.caution;return s;}};
      const row={case:c.name,category:c.category,focus:c.focus,caution:!!c.caution,run,...await evaluateWithQuestions(observed,c),factObservations};rows.push(row);writes=writes.then(()=>appendFile(`${out}/results.jsonl`,`${JSON.stringify(row)}\n`));
      if(row.failure&&row.failure!=='codex_evaluation_timeout')stopped=true;if(rows.length%25===0||stopped)console.log(JSON.stringify({completed:rows.length,planned:jobs.length,stopped}));
    }}
    await Promise.all(Array.from({length:concurrency},worker));await writes;assert.deepEqual(await hashes(),sourceHashes);
    const summary={...manifest,completedAt:new Date().toISOString(),completed:rows.length,stopped,sourcesUnchanged:true,resultsHash:digest(await readFile(`${out}/results.jsonl`)),main:summarizeDialogues(rows.filter(r=>!r.caution)),caution:summarizeDialogues(rows.filter(r=>r.caution))};
    await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});console.log(JSON.stringify({completed:rows.length,planned:jobs.length,main:summary.main}));if(stopped||rows.length!==jobs.length||rows.some(r=>!r.passed))process.exitCode=1;
  } finally {await target.close();}
}
