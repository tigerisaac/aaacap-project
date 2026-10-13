// Synthetic subscription-Luna conversations with native assistant/tool history.
// Prepared caller answers appear only after a question. This is not GPT Live or a voice test.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {digest} from './lib/public-scam-benchmark.mjs';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';

export async function evaluateDialogue(target,c){
  assert.equal(target.conversation,true);
  const state=target.newState(c.turns[0]),steps=[];let questionTurns=0,questionsPresent=true;
  try {
  for(const [index,turn]of c.turns.entries()){
    if(index)state.transcript=`${state.transcript} ${turn}`;
    const priorQuestions=state.questions,priorResearches=state.researches,priorAttempts=state.validationAttempts.length,start=Date.now();
    const step=await target.advance(state),actual=step.kind==='decision'?step.decision.action:step.kind==='question'?'continue':step.kind;
    if(step.kind==='question'){questionTurns++;questionsPresent&&=Boolean(step.question?.trim());}
    steps.push({stage:index+1,actual,reason:step.decision?.reason,failure:step.failure,continueToolCalls:state.questions-priorQuestions,researches:state.researches-priorResearches,questionChars:step.kind==='question'?(step.question?.trim().length??0):0,validationAttempts:state.validationAttempts.slice(priorAttempts),elapsedMs:Date.now()-start});
    if(actual!=='continue'||questionTurns>2||!questionsPresent)break;
  }
  const final=steps.at(-1);
  const sequenceMatches=!c.expectedSteps||JSON.stringify(steps.map(s=>s.actual))===JSON.stringify(c.expectedSteps);
  return {steps,actual:final.actual,failure:final.failure,questionTurns,questionsPresent,sequenceMatches,continueToolCalls:state.questions,researches:state.researches,passed:!final.failure&&c.accept.includes(final.actual)&&questionTurns<=2&&questionsPresent&&sequenceMatches&&(c.category!=='legit'||state.researches===0)};
  } finally { await target.release?.(state); }
}
export function summarizeDialogues(rows){
  const outcome=rr=>rr.reduce((a,r)=>(a[r.actual]=(a[r.actual]??0)+1,a),{}),ordinary=rows.filter(r=>r.category==='legit'),unsafe=rows.filter(r=>r.category==='scam');
  return {trials:rows.length,passes:rows.filter(r=>r.passed).length,failures:rows.filter(r=>r.failure).length,ordinaryOffered:{passed:ordinary.filter(r=>!r.failure&&r.actual==='approve').length,total:ordinary.length},ordinarySaved:{passed:ordinary.filter(r=>!r.failure&&r.actual==='message').length,total:ordinary.length},ordinaryOutcomes:outcome(ordinary),unsafeStopped:{passed:unsafe.filter(r=>!r.failure&&['block','hold'].includes(r.actual)).length,total:unsafe.length},unsafeSavedUnverified:unsafe.filter(r=>!r.failure&&r.actual==='message').length,unsafeOutcomes:outcome(unsafe),questionBudgetExceeded:rows.filter(r=>r.questionTurns>2).length,missingQuestionText:rows.filter(r=>!r.questionsPresent).length,sequenceErrors:rows.filter(r=>r.sequenceMatches===false).length,misses:rows.filter(r=>!r.passed).map(r=>({case:r.case,run:r.run,actual:r.actual,failure:r.failure,questionTurns:r.questionTurns,steps:r.steps.map(s=>s.actual)}))};
}
async function selfTest(){
 let calls=[],states=[];const mock=actions=>({conversation:true,newState:transcript=>({transcript,questions:0,researches:0,validationAttempts:[]}),advance:async state=>{calls.push(state.transcript);states.push(state);const action=actions.shift();if(action==='continue'||action==='empty'){state.questions++;return {kind:'question',question:action==='empty'?'':'What does she need to do?'};}if(action==='failure')return {kind:'failure',failure:'mock_failure'};return {kind:'decision',decision:{action}};}});
 const c={category:'legit',turns:['opening','reply','last reply'],accept:['approve']};
 let r=await evaluateDialogue(mock(['approve']),c);assert.equal(calls.length,1);assert.ok(r.passed);
 calls=[];states=[];r=await evaluateDialogue(mock(['continue','approve']),c);assert.deepEqual(calls,['opening','opening reply']);assert.equal(states[0],states[1]);assert.equal(r.questionTurns,1);assert.ok(r.passed);
 calls=[];r=await evaluateDialogue(mock(['continue','continue','continue']),c);assert.equal(r.questionTurns,3);assert.ok(!r.passed);
 calls=[];r=await evaluateDialogue(mock(['empty']),c);assert.equal(calls.length,1);assert.ok(!r.questionsPresent&&!r.passed);
 calls=[];r=await evaluateDialogue(mock(['failure']),c);assert.equal(calls.length,1);assert.ok(!r.passed);
 calls=[];r=await evaluateDialogue(mock(['approve']),{...c,expectedSteps:['continue','approve']});assert.equal(calls.length,1);assert.ok(!r.passed&&!r.sequenceMatches);
 calls=[];r=await evaluateDialogue(mock(['message']),{...c,accept:['message'],expectedSteps:['message']});assert.ok(r.passed);assert.equal(calls.length,1);
 assert.deepEqual(summarizeDialogues([{...r,category:'legit'}]).ordinarySaved,{passed:1,total:1});
 assert.equal(summarizeDialogues([{...r,category:'scam'}]).unsafeStopped.passed,0);
 console.log(JSON.stringify({passed:true,checks:['terminal prevents future input','only questions expose prepared answers','one persistent state','question-turn budget','empty question receives no credit','failures retained','premature approval fails required sequence','saved notices are not scam stops']}));
}
async function main(){
 if(process.argv.includes('--self-test'))return selfTest();
 const args=process.argv.slice(2),option=(key,def)=>{const i=args.indexOf(key);return i<0?def:args.splice(i,2)[1];};
 const requestFile=option('--request'),cautionFile=option('--caution-request'),fixtureFile=option('--cases'),out=option('--out'),repeat=Number(option('--repeat','5')),concurrency=Number(option('--concurrency','4'));
 assert.ok(!args.length&&requestFile&&fixtureFile&&out);assert.ok(Number.isInteger(repeat)&&repeat>0&&repeat<=12);assert.ok(Number.isInteger(concurrency)&&concurrency>0&&concurrency<=8);
 const fixture=await import(pathToFileURL(resolve(fixtureFile)).href),all=[...(fixture.cases??[]),...(fixture.stagedCases??[])];
 assert.ok(all.length);assert.equal(new Set(all.map(c=>c.name)).size,all.length);assert.ok(all.every(c=>c.turns.length&&c.accept.length));if(all.some(c=>c.caution))assert.ok(cautionFile);
 const requests={normal:JSON.parse(await readFile(requestFile,'utf8'))};if(cautionFile)requests.caution=JSON.parse(await readFile(cautionFile,'utf8'));
 const files=[fixtureFile,requestFile,...(cautionFile?[cautionFile]:[]),'scripts/check-screening-dialogues.mjs','scripts/lib/codex-screening-target.mjs','scripts/lib/screening-argument-issues.mjs','scripts/check-screening-subscription-dialogue.mjs','scripts/lib/screening-codex-models.json','backend/src/live/policy.ts','backend/src/live/evidence.ts','backend/src/live/decision-progress.ts','dist/live/policy.js','dist/live/evidence.js','dist/live/decision-progress.js',...(fixture.sourceFiles??[])];
 const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,digest(await readFile(p))]))),before=await hashes();
 const targets={},results=[];let cursor=0,stopped=false,writes=Promise.resolve();
 const jobs=Array.from({length:repeat},(_,i)=>all.map(c=>({c,run:i+1}))).flat();
 await mkdir(out,{recursive:true});await writeFile(`${out}/results.jsonl`,'',{flag:'wx'});
 try{
  for(const [k,request]of Object.entries(requests)){targets[k]=await codexScreeningTarget(request,{conversation:true});assert.equal(targets[k].conversation,true);}
  const manifest={startedAt:new Date().toISOString(),provider:'codex',model:'gpt-6-luna',effort:'medium',transport:targets.normal.transport,sourceHashes:before,requestHashes:Object.fromEntries(Object.entries(requests).map(([k,r])=>[k,digest(JSON.stringify(r))])),repeat,concurrency,planned:jobs.length,cases:all.map(c=>({name:c.name,category:c.category,focus:c.focus,accept:c.accept,caution:!!c.caution,stages:c.turns.length,inputHash:digest(JSON.stringify(c.turns)),...(c.expectedSteps?{expectedSteps:c.expectedSteps}:{})})),interpretation:'Synthetic prepared answers conditioned on a question, native assistant/tool history retained, cumulative caller snapshots. Stop after terminal decision; no future answer exposure. Question turns and continue-tool calls reported separately. Required action sequences count toward pass/fail. Saved notices are separate from offers and stops. Not adaptive caller behavior, GPT Live, real calls, or production latency. No output-based retries.'};
  await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
  async function worker(){while(!stopped&&cursor<jobs.length){const {c,run}=jobs[cursor++],result={case:c.name,category:c.category,focus:c.focus,caution:!!c.caution,run,...await evaluateDialogue(targets[c.caution?'caution':'normal'],c)};results.push(result);writes=writes.then(()=>appendFile(`${out}/results.jsonl`,`${JSON.stringify(result)}\n`));if(result.failure&&result.failure!=='codex_evaluation_timeout')stopped=true;if(results.length%25===0||stopped)console.log(JSON.stringify({completed:results.length,planned:jobs.length,stopped}));}}
  await Promise.all(Array.from({length:concurrency},worker));await writes;assert.deepEqual(await hashes(),before);
  const summary={...manifest,completedAt:new Date().toISOString(),completed:results.length,stopped,sourcesUnchanged:true,resultsHash:digest(await readFile(`${out}/results.jsonl`)),main:summarizeDialogues(results.filter(r=>!r.caution)),caution:summarizeDialogues(results.filter(r=>r.caution))};
  await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});console.log(JSON.stringify({completed:results.length,planned:jobs.length,main:summary.main,caution:summary.caution}));if(stopped||results.length!==jobs.length||results.some(r=>!r.passed))process.exitCode=1;
 }finally{for(const target of Object.values(targets))await target.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
