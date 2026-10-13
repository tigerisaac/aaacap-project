// Offline subscription-only comparison of the structured-facts experiment on the
// unchanged public adapters/scorers. No transcripts or quoted evidence are saved.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {liveSessionConfig} from '../dist/live/policy.js';
import {MASC,MASC_SCORING,digest,parseCSV,mascCase,summarizeMASC} from './lib/public-scam-benchmark.mjs';
import {ROBOCALL,robocallCase,selectRobocalls,summarizeRobocalls} from './lib/robocall-benchmark.mjs';
import * as v103 from './experiments/observed-screening-v103.mjs';
import * as v104 from './experiments/observed-screening-v104.mjs';
import * as v109 from './experiments/observed-screening-v109.mjs';
import * as v110 from './experiments/observed-screening-v110.mjs';
const args=process.argv.slice(2),option=(name,def)=>{const i=args.indexOf(name);return i<0?def:args.splice(i,2)[1];},flag=name=>{const i=args.indexOf(name);if(i<0)return false;args.splice(i,1);return true;};
const policy=option('--policy','v103');assert.ok(['v103','v104','v109','v110'].includes(policy));
const selected={v103,v104,v109,v110}[policy];
const {factsSchema,observedScreeningRequest,interpretFacts,SCREENING_POLICY_VERSION}=selected;
const dataset=option('--dataset'),out=option('--out'),concurrency=Number(option('--concurrency','6')),approved=flag('--real-calls-approved');
const resumeFrom=option('--resume-from'),resumeSourceRoot=option('--resume-source-root');
const prepareOnly=flag('--prepare-only');
assert.equal(!!resumeFrom,!!resumeSourceRoot,'resumption needs the original source root for hash verification');
assert.ok(!args.length&&out&&['masc','ftc'].includes(dataset));assert.ok(Number.isInteger(concurrency)&&concurrency>0&&concurrency<=8);if(dataset==='ftc')assert.ok(approved,'public FTC transcripts require the explicit owner exception');
const cfg=dataset==='masc'?MASC:ROBOCALL,sourceFile=`artifacts/public-benchmarks/${dataset==='masc'?'masc':'robocall'}-${cfg.revision}.csv`;
// Deliberately reuse the pinned cache verified in the ordinary benchmark run.
// No new dataset, train split, private caller data or audio is fetched here.
const csv=await readFile(sourceFile,'utf8'),source=JSON.parse(await readFile(`${sourceFile}.json`,'utf8'));
assert.equal(source.revision,cfg.revision);assert.equal(source.dataset,cfg.dataset);assert.equal(digest(csv),source.sha256);
const parsed=parseCSV(csv);assert.equal(parsed.length,cfg.expectedRows);
const cases=dataset==='masc'?parsed.map(mascCase):selectRobocalls(parsed.map(robocallCase)).cases;
assert.equal(cases.length,dataset==='masc'?320:724);assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
const request=observedScreeningRequest(liveSessionConfig().delegation.responses);
// Continue only unrun identities into a new output directory. Completed failures
// stay in the exact original prefix; finalized evidence is never overwritten.
let prefix='',previousRows=[],continuation;
if(resumeFrom){
  const old=JSON.parse(await readFile(`${resumeFrom}/summary.json`,'utf8'));
  assert.equal(old.screeningRequestHash,digest(JSON.stringify(request)));assert.equal(old.policyVersion,SCREENING_POLICY_VERSION);
  assert.equal(old.model,'gpt-6-luna');assert.equal(old.effort,'medium');assert.equal(old.provider,'codex');assert.equal(old.repeat,1);
  assert.equal(old.sha256,source.sha256);assert.equal(old.revision,cfg.revision);assert.equal(old.planned,cases.length);
  assert.deepEqual(new Set(old.selectedIds),new Set(cases.map(c=>c.id)));
  for(const [p,h]of Object.entries(old.sourceHashes))assert.equal(digest(await readFile(resolve(resumeSourceRoot,p))),h,p);
  prefix=await readFile(`${resumeFrom}/results.jsonl`,'utf8');assert.equal(digest(prefix),old.sourceResultsHash);
  previousRows=prefix.trim()?prefix.trim().split('\n').map(JSON.parse):[];
  assert.equal(previousRows.length,old.completed);assert.equal(new Set(previousRows.map(r=>r.id)).size,previousRows.length);
  for(const r of previousRows){const c=cases.find(c=>c.id===r.id);assert.ok(c);assert.equal(r.run,1);assert.equal(r.sourceHash,c.sourceHash);
    for(const key of dataset==='masc'?['type','label','personality','screeningGroup']:['campaign','copies'])assert.equal(r[key],c[key]);
  }
  assert.ok(previousRows.length<cases.length,'nothing remains to evaluate');
  assert.ok(!prefix||prefix.endsWith('\n'));
  continuation={source:resolve(resumeFrom),sourceRoot:resolve(resumeSourceRoot),originalSummaryHash:digest(await readFile(`${resumeFrom}/summary.json`)),prefixHash:digest(prefix),prefixBytes:Buffer.byteLength(prefix),completedPrefixRows:previousRows.length,remainingInputs:cases.length-previousRows.length,completedFailuresRetained:true};
}
if(prepareOnly){console.log(JSON.stringify({prepared:true,externalInference:false,dataset,requestHash:digest(JSON.stringify(request)),completedPrefixRows:previousRows.length,remainingInputs:cases.length-previousRows.length}));process.exit(0);}
const files=['scripts/check-public-screening-observations.mjs','scripts/experiments/observed-screening-v105.mjs','scripts/experiments/observed-screening-v106.mjs','scripts/experiments/observed-screening-v107.mjs','scripts/experiments/observed-screening-v108.mjs','scripts/experiments/observed-screening-v109.mjs','scripts/experiments/observed-screening-v110.mjs','scripts/experiments/observed-screening-v104.mjs','scripts/experiments/observed-screening-v103.mjs','scripts/experiments/observed-screening-v102.mjs','scripts/lib/codex-screening-target.mjs','scripts/check-screening-subscription.mjs','scripts/lib/screening-codex-models.json','scripts/lib/public-scam-benchmark.mjs','scripts/lib/robocall-benchmark.mjs','backend/src/live/policy.ts','backend/src/live/evidence.ts','backend/src/live/decision-progress.ts','dist/live/policy.js','dist/live/evidence.js','dist/live/decision-progress.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,digest(await readFile(p))]))),sourceHashes=await hashes();
await mkdir(out,{recursive:true});await writeFile(`${out}/request.json`,JSON.stringify(request,null,2),{flag:'wx'});await writeFile(`${out}/results.jsonl`,prefix,{flag:'wx'});
const target=await codexScreeningTarget(request,{interpretDecision:(value,transcript,state)=>{
  const checked=factsSchema.safeParse(value),decision=interpretFacts(value,transcript,state);
  if(checked.success){const {evidence,...facts}=checked.data;const observation=selected.observeFacts?selected.observeFacts(value,transcript):{facts};state.factObservations.push({...observation,mappedAction:decision?.action,questionCount:state.questions});}
  else state.factObservations.push({invalidFacts:true});
  return decision;
}});
const manifest={...source,startedAt:new Date().toISOString(),provider:'codex',model:'gpt-6-luna',effort:'medium',transport:target.transport,mode:'screening',repeat:1,concurrency,policyVersion:SCREENING_POLICY_VERSION,screeningVersion:'frozen-observed-request',frozenRequest:`${out}/request.json`,screeningRequestHash:digest(JSON.stringify(request)),sourceHashes,scoring:MASC_SCORING,selectedIds:cases.map(c=>c.id),...(dataset==='ftc'?{screeningContext:'opening',fullUniqueSet:true,realCallApproval:'Owner exception for public FTC/NC State transcripts; no audio.'}:{}),interpretation:'Same pinned public rows, caller-only input, one pass and original outcome scoring. The model records facts, a frozen offline mapper chooses the action, and production evidence/schema checks still apply. Labels and prior decisions never enter model input. Saved unverified messages and clarifications are not completed scam stops. No voice, early-intervention, deployment or real-call claim.'};
if(continuation)manifest.continuation=continuation;
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
const rows=[...previousRows],completedIds=new Set(rows.map(r=>r.id)),jobs=cases.filter(c=>!completedIds.has(c.id));let cursor=0,interrupted=false,writes=Promise.resolve();
try{
  async function worker(){while(!interrupted&&cursor<jobs.length){const c=jobs[cursor++],began=Date.now(),state=target.newState(dataset==='masc'?c.callerText:c.callerOpening);state.factObservations=[];
    const step=await target.advance(state),screening={actual:step.kind==='decision'?step.decision.action:step.kind==='question'?'continue':step.kind,reason:step.decision?.reason,failure:step.failure,questions:state.questions,researches:state.researches};
    const row={id:c.id,sourceHash:c.sourceHash,...(dataset==='masc'?{type:c.type,label:c.label,personality:c.personality,screeningGroup:c.screeningGroup}:{campaign:c.campaign,copies:c.copies}),run:1,screening,elapsedMs:Date.now()-began,factObservations:state.factObservations,validationAttempts:state.validationAttempts};
    rows.push(row);writes=writes.then(()=>appendFile(`${out}/results.jsonl`,`${JSON.stringify(row)}\n`));
    // A completed per-case timeout remains a failure, but does not discard the
    // remaining planned inputs. Authentication/transport failures stop new work.
    if(screening.failure&&screening.failure!=='codex_evaluation_timeout')interrupted=true;
    if(rows.length%50===0||interrupted)console.log(JSON.stringify({completed:rows.length,planned:cases.length,interrupted}));
  }}
  await Promise.all(Array.from({length:concurrency},worker));await writes;
  assert.deepEqual(await hashes(),sourceHashes);
  const metrics=dataset==='masc'?summarizeMASC(rows):summarizeRobocalls(rows),summary={...manifest,completedAt:new Date().toISOString(),completed:rows.length,planned:cases.length,interrupted,productionUnchanged:true,sourceResultsHash:digest(await readFile(`${out}/results.jsonl`)),...metrics};
  await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});
  const {byCampaign,byType,...headline}=metrics;console.log(JSON.stringify({completed:rows.length,planned:cases.length,interrupted,headline}));
  if(interrupted||rows.length!==cases.length||rows.some(r=>r.screening.failure))process.exitCode=1;
}finally{await target.close();}
