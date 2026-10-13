// Offline synthetic-only experiment. Model observes facts; a frozen deterministic
// mapper chooses the existing decision, which still passes production validation.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {codexMessageTarget} from './lib/codex-message-target.mjs';
import {evaluateWithQuestions} from './check-screening-synthetic-questions.mjs';
import {summarizeDialogues} from './check-screening-dialogues.mjs';
import {digest} from './lib/public-scam-benchmark.mjs';
import {liveSessionConfig,permittedDecision} from '../dist/live/policy.js';
import * as v102 from './experiments/observed-screening-v102.mjs';
import * as v103 from './experiments/observed-screening-v103.mjs';
import * as v104 from './experiments/observed-screening-v104.mjs';
import * as v105 from './experiments/observed-screening-v105.mjs';
import * as v106 from './experiments/observed-screening-v106.mjs';
import * as v107 from './experiments/observed-screening-v107.mjs';
import * as v108 from './experiments/observed-screening-v108.mjs';
import * as v109 from './experiments/observed-screening-v109.mjs';
import * as v110 from './experiments/observed-screening-v110.mjs';
import * as v111 from './experiments/observed-screening-v111.mjs';
import * as v112 from './experiments/observed-screening-v112.mjs';
import * as v113 from './experiments/observed-screening-v113.mjs';
import * as v114 from './experiments/observed-screening-v114.mjs';
import * as v115 from './experiments/observed-screening-v115.mjs';
import * as v116 from './experiments/observed-screening-v116.mjs';
import * as v117 from './experiments/observed-screening-v117.mjs';
import * as v118 from './experiments/observed-screening-v118.mjs';
import * as v119 from './experiments/observed-screening-v119.mjs';
import * as v120 from './experiments/observed-screening-v120.mjs';
import * as v121 from './experiments/observed-screening-v121.mjs';
import * as v122 from './experiments/observed-screening-v122.mjs';
import * as v123 from './experiments/observed-screening-v123.mjs';
import * as v126 from './experiments/observed-screening-v126.mjs';
import * as v127 from './experiments/observed-screening-v127.mjs';
import * as v128 from './experiments/observed-screening-v128.mjs';
import * as v129 from './experiments/observed-screening-v129.mjs';
import * as v130 from './experiments/observed-screening-v130.mjs';
import * as v131 from './experiments/observed-screening-v131.mjs';
import * as v132 from './experiments/observed-screening-v132.mjs';
import * as v133 from './experiments/observed-screening-v133.mjs';
import * as v135 from './experiments/observed-screening-v135.mjs';
import * as v136 from './experiments/observed-screening-v136.mjs';
import * as v137 from './experiments/observed-screening-v137.mjs';
import * as v138 from './experiments/observed-screening-v138.mjs';
import * as v139 from './experiments/observed-screening-v139.mjs';
import * as v140 from './experiments/observed-screening-v140.mjs';
import * as v141 from './experiments/observed-screening-v141.mjs';
import * as v142 from './experiments/observed-screening-v142.mjs';
import * as v143 from './experiments/observed-screening-v143.mjs';
import * as v144 from './experiments/observed-screening-v144.mjs';
import * as v145 from './experiments/observed-screening-v145.mjs';
import * as v146 from './experiments/observed-screening-v146.mjs';
import * as v147 from './experiments/observed-screening-v147.mjs';
import * as v148 from './experiments/observed-screening-v148.mjs';
import * as v149 from './experiments/observed-screening-v149.mjs';
import * as v150 from './experiments/observed-screening-v150.mjs';
import * as v151 from './experiments/observed-screening-v151.mjs';
import * as v152 from './experiments/observed-screening-v152.mjs';
import * as v153 from './experiments/observed-screening-v153.mjs';
const policyIndex=process.argv.indexOf('--policy');
const policy=policyIndex<0?'v102':process.argv.splice(policyIndex,2)[1];
assert.ok(['v102','v103','v104','v105','v106','v107','v108','v109','v110','v111','v112','v113','v114','v115','v116','v117','v118','v119','v120','v121','v122','v123','v126','v127','v128','v129','v130','v131','v132','v133','v135','v136','v137','v138','v139','v140','v141','v142','v143','v144','v145','v146','v147','v148','v149','v150','v151','v152','v153'].includes(policy));
const selected={v102,v103,v104,v105,v106,v107,v108,v109,v110,v111,v112,v113,v114,v115,v116,v117,v118,v119,v120,v121,v122,v123,v126,v127,v128,v129,v130,v131,v132,v133,v135,v136,v137,v138,v139,v140,v141,v142,v143,v144,v145,v146,v147,v148,v149,v150,v151,v152,v153}[policy];
const {factsSchema,observedScreeningRequest,interpretFacts,SCREENING_POLICY_VERSION}=selected;

if(process.argv.includes('--self-test')&&policy!=='v102') {
  await selected.selfTest();
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
  const request=observedScreeningRequest(liveSessionConfig().delegation.responses),files=[fixtureFile,...(fixture.sourceFiles??[]),'scripts/check-screening-observations.mjs','scripts/experiments/observed-screening-v102.mjs','scripts/experiments/observed-screening-v103.mjs','scripts/experiments/observed-screening-v104.mjs','scripts/experiments/observed-screening-v105.mjs','scripts/experiments/observed-screening-v106.mjs','scripts/experiments/observed-screening-v107.mjs','scripts/experiments/observed-screening-v108.mjs','scripts/experiments/observed-screening-v109.mjs','scripts/experiments/observed-screening-v110.mjs','scripts/experiments/observed-screening-v111.mjs','scripts/experiments/observed-screening-v112.mjs','scripts/experiments/observed-screening-v113.mjs','scripts/experiments/observed-screening-v114.mjs','scripts/experiments/observed-screening-v115.mjs','scripts/experiments/observed-screening-v116.mjs','scripts/experiments/observed-screening-v117.mjs','scripts/experiments/observed-screening-v118.mjs','scripts/experiments/observed-screening-v119.mjs','scripts/experiments/observed-screening-v120.mjs','scripts/experiments/observed-screening-v121.mjs','scripts/experiments/observed-screening-v122.mjs','scripts/experiments/observed-screening-v123.mjs','scripts/experiments/observed-screening-v126.mjs','scripts/experiments/observed-screening-v127.mjs','scripts/experiments/observed-screening-v128.mjs','scripts/experiments/observed-screening-v129.mjs','scripts/experiments/observed-screening-v130.mjs','scripts/experiments/observed-screening-v131.mjs','scripts/experiments/observed-screening-v132.mjs','scripts/experiments/observed-screening-v133.mjs','scripts/experiments/observed-screening-v135.mjs','scripts/experiments/observed-screening-v136.mjs','scripts/experiments/observed-screening-v137.mjs','scripts/experiments/observed-screening-v138.mjs','scripts/experiments/observed-screening-v139.mjs','scripts/experiments/observed-screening-v140.mjs','scripts/experiments/observed-screening-v141.mjs','scripts/experiments/observed-screening-v142.mjs','scripts/experiments/observed-screening-v143.mjs','scripts/experiments/observed-screening-v144.mjs','scripts/experiments/observed-screening-v145.mjs','scripts/experiments/observed-screening-v146.mjs','scripts/experiments/observed-screening-v147.mjs','scripts/experiments/observed-screening-v148.mjs','scripts/experiments/observed-screening-v149.mjs','scripts/experiments/observed-screening-v150.mjs','scripts/experiments/observed-screening-v151.mjs','scripts/experiments/observed-screening-v152.mjs','scripts/experiments/observed-screening-v153.mjs','scripts/experiments/approval-review-v122.mjs','scripts/lib/codex-message-target.mjs','scripts/check-message-subscription.mjs','scripts/check-screening-subscription-approval.mjs','scripts/lib/codex-screening-target.mjs','scripts/lib/screening-argument-issues.mjs','scripts/check-screening-dialogues.mjs','scripts/check-screening-synthetic-questions.mjs','scripts/check-screening-subscription-dialogue.mjs','scripts/lib/screening-codex-models.json','backend/src/live/policy.ts','backend/src/live/decision-progress.ts','dist/live/policy.js','dist/live/evidence.js','dist/live/decision-progress.js'];
  const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,digest(await readFile(p))]))),sourceHashes=await hashes();
  await mkdir(out,{recursive:true});await writeFile(`${out}/request.json`,JSON.stringify(request,null,2),{flag:'wx'});await writeFile(`${out}/results.jsonl`,'',{flag:'wx'});
  const reviewer=selected.approvalReview?await codexMessageTarget():undefined;
  const reviewTemplate=selected.approvalReview?.reviewRequest('');
  if(reviewTemplate)await writeFile(`${out}/approval-review-request.json`,JSON.stringify(reviewTemplate,null,2),{flag:'wx'});
  const target=await codexScreeningTarget(request,{...(reviewer?{approvalGuard:selected.approvalReview.createApprovalGuard(reviewer)}:{}),callerFraming:selected.callerFraming??'legacy',clarificationFor:selected.clarificationFor,argumentSchema:factsSchema,argumentFeedback:selected.argumentFeedback??false,conversation:true,interpretDecision:(raw,transcript,state)=>{
    const parsed=factsSchema.safeParse(raw),decision=interpretFacts(raw,transcript,state,{caution:state.caution});
    if(parsed.success){const {evidence,...facts}=parsed.data;const observation=selected.observeFacts?selected.observeFacts(raw,transcript):{facts};state.factObservations.push({...observation,mappedAction:decision?.action,questionCount:state.questions});}
    else state.factObservations.push({invalidFacts:true});
    return decision;
  }}).catch(async error=>{await reviewer?.close();throw error;});
  const jobs=Array.from({length:repeat},(_,i)=>cases.map(c=>({c,run:i+1}))).flat(),rows=[];
  const manifest={startedAt:new Date().toISOString(),policyVersion:SCREENING_POLICY_VERSION,decisionMode:selected.decisionMode??'observations',provider:'codex',model:'gpt-6-luna',effort:'medium',transport:target.transport,...(reviewer?{approvalReview:{requestHash:digest(JSON.stringify(reviewTemplate)),instructionChars:reviewTemplate.instructions.length,schemaChars:JSON.stringify(reviewTemplate.text.format.schema).length,transport:reviewer.transport,scope:'Each validated offer receives an independent caller-only review. No first-pass answer or evaluation metadata is sent.'}}:{}),sourceHashes,requestHash:digest(JSON.stringify(request)),instructionChars:request.instructions.length,toolChars:JSON.stringify(request.tools).length,repeat,concurrency,planned:jobs.length,cases:cases.map(c=>({name:c.name,category:c.category,focus:c.focus,accept:c.accept,caution:!!c.caution,expectedSteps:c.expectedSteps,inputHash:digest(JSON.stringify(c.turns))})),interpretation:`Synthetic offline experiment. ${selected.decisionMode?.startsWith('direct')?'The model proposes an action; the mapper applies the frozen priority and limit checks.':'The model reports facts and the mapper chooses the action.'} Caller quotes are not saved. Expected labels and prepared future replies are never model input. Native questions use the existing bounded adapter. Recent-call caution ${policy!=='v102'?'uses trusted application state in the mapper':'is explicitly unsupported'}. Production is unchanged.`};
  await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
  let cursor=0,stopped=false,writes=Promise.resolve();
  try {
    async function worker(){while(!stopped&&cursor<jobs.length){const {c,run}=jobs[cursor++],factObservations=[],approvalReviews=[],observed={...target,newState:transcript=>{const s=target.newState(transcript);s.factObservations=factObservations;if(reviewer)s.approvalReviews=approvalReviews;s.caution=!!c.caution;return s;}};
      const row={case:c.name,category:c.category,focus:c.focus,caution:!!c.caution,run,...await evaluateWithQuestions(observed,c),factObservations,...(reviewer?{approvalReviews}:{})};rows.push(row);writes=writes.then(()=>appendFile(`${out}/results.jsonl`,`${JSON.stringify(row)}\n`));
      if(row.failure&&!['codex_evaluation_timeout','approval_guard_failed'].includes(row.failure))stopped=true;if(rows.length%25===0||stopped)console.log(JSON.stringify({completed:rows.length,planned:jobs.length,stopped}));
    }}
    await Promise.all(Array.from({length:concurrency},worker));await writes;assert.deepEqual(await hashes(),sourceHashes);
    const summary={...manifest,completedAt:new Date().toISOString(),completed:rows.length,stopped,sourcesUnchanged:true,resultsHash:digest(await readFile(`${out}/results.jsonl`)),main:summarizeDialogues(rows.filter(r=>!r.caution)),caution:summarizeDialogues(rows.filter(r=>r.caution))};
    await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});console.log(JSON.stringify({completed:rows.length,planned:jobs.length,main:summary.main}));if(stopped||rows.length!==jobs.length||rows.some(r=>!r.passed))process.exitCode=1;
  } finally {await target.close();await reviewer?.close();}
}
