// Fresh, frozen baseline/candidate comparison on subscription Luna. No caller text, questions or quotes in output.
// Cumulative caller snapshots, not a conversational/voice simulator. Stop on the first terminal action.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {digest} from './lib/public-scam-benchmark.mjs';
import {screeningTarget} from './lib/screening-target.mjs';

export async function evaluateScenario(target,c) {
  const steps=[];let transcript='';
  for(const [i,turn]of c.turns.entries()){
    transcript=[transcript,turn].filter(Boolean).join(' ');
    const state=target.newState(transcript),start=Date.now();
    const step=await target.advance(state);
    const actual=step.kind==='decision'?step.decision.action:step.kind==='question'?'continue':step.kind;
    steps.push({stage:i+1,actual,reason:step.decision?.reason,failure:step.failure,questions:state.questions,researches:state.researches,elapsedMs:Date.now()-start});
    if(actual!=='continue')break;
  }
  const final=steps.at(-1),questions=steps.reduce((n,s)=>n+s.questions,0),researches=steps.reduce((n,s)=>n+s.researches,0);
  return {steps,actual:final.actual,failure:final.failure,questions,researches,passed:!final.failure&&c.accept.includes(final.actual)&&questions<=2&&(c.category!=='legit'||researches===0)};
}
export function summarize(rows){
  const ordinary=rows.filter(r=>r.category==='legit'),harm=rows.filter(r=>r.category==='scam');
  const ok=r=>!r.failure;
  const count=(rs,a)=>rs.filter(r=>ok(r)&&a.includes(r.actual)).length;
  const outcomes=rs=>rs.reduce((a,r)=>(a[r.actual]=(a[r.actual]??0)+1,a),{});
  return {trials:rows.length,passes:rows.filter(r=>r.passed).length,failures:rows.filter(r=>r.failure).length,
    legitimateOffered:{passed:count(ordinary,['approve']),total:ordinary.length},ordinaryOutcomes:outcomes(ordinary),
    harmfulStopped:{passed:count(harm,['block','hold']),total:harm.length},harmfulOutcomes:outcomes(harm),
    firstStepHarmfulStops:harm.filter(r=>['block','hold'].includes(r.steps[0].actual)&&!r.steps[0].failure).length,
    byFocus:Object.fromEntries([...new Set(rows.map(r=>r.focus))].map(f=>[f,outcomes(rows.filter(r=>r.focus===f))])),
    misses:rows.filter(r=>!r.passed).map(({case:name,actual,failure,run,steps})=>({case:name,actual,failure,run,steps}))};
}
async function selfTest(){
  let calls=[];const mock=actions=>({newState:text=>({text,questions:0,researches:0}),advance:async state=>{calls.push(state.text);const action=actions.shift();if(action==='continue'){state.questions++;return {kind:'question'};}if(action==='failure')return {kind:'failure',failure:'mock_timeout'};return {kind:'decision',decision:{action}};}});
  const c={turns:['opening','follow-up'],category:'legit',accept:['approve']};
  let r=await evaluateScenario(mock(['approve']),c);assert.deepEqual(calls,['opening']);assert.equal(r.passed,true);
  calls=[];r=await evaluateScenario(mock(['continue','approve']),c);assert.deepEqual(calls,['opening','opening follow-up']);assert.equal(r.questions,1);assert.ok(r.passed);
  calls=[];r=await evaluateScenario(mock(['failure']),c);assert.deepEqual(calls,['opening']);assert.ok(!r.passed);assert.equal(r.failure,'mock_timeout');
  const metrics=summarize([{...r,category:'legit',focus:'test',steps:r.steps}]);assert.equal(metrics.legitimateOffered.passed,0);assert.equal(metrics.legitimateOffered.total,1);
  console.log(JSON.stringify({passed:true,checks:['terminal stops before future caller input','only questions expose follow-up','cumulative evidence preserved','failure retained without success credit']}));
}
async function main(){
  if(process.argv.includes('--self-test'))return selfTest();
  const args=process.argv.slice(2),option=(name,def)=>{const i=args.indexOf(name);return i<0?def:args.splice(i,2)[1];};
  const root=resolve(option('--root','artifacts/v30-v37-realworld')),casesFile=option('--cases','scripts/fixtures/holdout/v30-v37-realworld.mjs');
  const candidate=option('--candidate','v37');assert.match(candidate,/^v[0-9]+$/);assert.notEqual(candidate,'v30');const versions=['v30',candidate];
  const repeat=Number(option('--repeat','3')),concurrency=Number(option('--concurrency','8'));
  assert.ok(!args.length&&Number.isInteger(repeat)&&repeat>0&&repeat<=10&&Number.isInteger(concurrency)&&concurrency>0&&concurrency<=12);
  const {cases,stagedCases}=await import(pathToFileURL(resolve(casesFile)).href),all=[...cases,...stagedCases];
  assert.equal(new Set(all.map(c=>c.name)).size,all.length);
  for(const c of all)assert.ok(c.turns.length&&c.turns.length<=3&&c.accept.length&&['legit','scam','ad','unclear','context'].includes(c.category));
  const freeze=JSON.parse(await readFile(`${root}/prompt-freeze.json`,'utf8'));
  const files=[casesFile,'scripts/check-paired-screening-redteam.mjs',...Object.keys(freeze.sourceHashes)];
  const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,digest(await readFile(p))]))),before=await hashes();
  for(const [p,h]of Object.entries(freeze.sourceHashes))assert.equal(before[p],h);
  const requests={};for(const key of Object.keys(freeze.requestHashes)){requests[key]=JSON.parse(await readFile(`${root}/${key}.json`,'utf8'));assert.equal(digest(JSON.stringify(requests[key])),freeze.requestHashes[key]);}
  const jobs=[];for(let run=1;run<=repeat;run++)for(const c of all)for(const version of run%2?versions:[...versions].reverse())jobs.push({c,version,run});
  const out=`${root}/paired`;await mkdir(out,{recursive:true});await writeFile(`${out}/results.jsonl`,'',{flag:'wx'});
  const targets={};let results=[],writes=Promise.resolve(),cursor=0,stopped=false;
  try{
    for(const [key,request]of Object.entries(requests))targets[key]=await screeningTarget('codex',{request,subscriptionOneShot:true});
    const manifest={startedAt:new Date().toISOString(),provider:'codex',model:'gpt-6-luna',effort:'medium',transport:targets.v30.transport,requestHashes:freeze.requestHashes,cautionIntegration:freeze.cautionIntegration,sourceHashes:before,repeat,concurrency,planned:jobs.length,
      cases:all.map(({name,category,focus,accept,turns,staged,caution})=>({name,category,focus,accept,stages:turns.length,staged:!!staged,caution:!!caution})),
      interpretation:'Fresh author-designed cases. Both versions unchanged, same cases/settings, alternating order per repetition. Follow-ups are fixed cumulative caller snapshots reached only after continue, without assistant-history or question-sensitive responses. No live conversation, voice or latency guarantee. Context cases use an explicit identical trusted caution paragraph; See the frozen cautionIntegration field for candidate context handling. No output-based retries; timeouts retained.'};
    await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
    async function worker(){while(!stopped&&cursor<jobs.length){const {c,version,run}=jobs[cursor++];const result={case:c.name,category:c.category,focus:c.focus,suite:c.caution?'context':c.staged?'staged':'snapshot',version,run,...await evaluateScenario(targets[`${version}${c.caution?'Caution':''}`],c)};results.push(result);writes=writes.then(()=>appendFile(`${out}/results.jsonl`,`${JSON.stringify(result)}\n`));
      if(result.failure&&result.failure!=='codex_evaluation_timeout')stopped=true;
      if(results.length%40===0||stopped)console.log(JSON.stringify({completed:results.length,planned:jobs.length,stopped}));}}
    await Promise.all(Array.from({length:concurrency},worker));await writes;
    const unchanged=JSON.stringify(before)===JSON.stringify(await hashes());assert.ok(unchanged);
    for(const key of Object.keys(requests))assert.equal(digest(JSON.stringify(JSON.parse(await readFile(`${root}/${key}.json`,'utf8')))),freeze.requestHashes[key]);
    const summary={...manifest,completedAt:new Date().toISOString(),completed:results.length,stopped,sourcesUnchanged:unchanged,resultsHash:digest(await readFile(`${out}/results.jsonl`)),versions:Object.fromEntries(versions.map(v=>[v,Object.fromEntries(['snapshot','staged','context'].map(s=>[s,summarize(results.filter(r=>r.version===v&&r.suite===s))]))]))};
    await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});console.log(JSON.stringify({completed:results.length,planned:jobs.length,sourcesUnchanged:unchanged}));
    if(stopped||results.length!==jobs.length||results.some(r=>r.failure))process.exitCode=1;
  }finally{for(const t of Object.values(targets))await t.close?.();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
