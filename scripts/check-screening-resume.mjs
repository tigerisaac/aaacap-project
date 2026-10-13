// Local integrity tests only. No model, credentials or caller data.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {syntheticContinuation,syntheticCaseMetadata} from './lib/screening-resume.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const root=await mkdtemp(join(tmpdir(),'screening-resume-test-'));
let checks=0;
try {
  const from=join(root,'out'),sourceRoot=join(root,'source');
  await mkdir(from);await mkdir(join(sourceRoot,'scripts'),{recursive:true});
  const runner='scripts/check-screening-observations.mjs';
  await writeFile(join(sourceRoot,runner),'old runner');await writeFile(join(sourceRoot,'policy.mjs'),'frozen policy');
  const cases=[{name:'a',category:'legitimate',focus:'identity',accept:['approve'],turns:['Authored caller A.']},{name:'b',category:'harmful',focus:'contact',accept:['block'],turns:['Authored caller B.']}];
  const request={instructions:'Frozen instructions',tools:[]};
  const rows=[{case:'b',category:'harmful',focus:'contact',caution:false,run:2,failure:'codex_turn_failed',passed:false},{case:'a',category:'legitimate',focus:'identity',caution:false,run:1,action:'approve',passed:true}];
  const prefix=rows.map(r=>JSON.stringify(r)+'\n').join('');
  const summary={policyVersion:'test-v1',requestHash:hash(JSON.stringify(request)),provider:'codex',model:'gpt-6-luna',effort:'medium',repeat:2,planned:4,sourcesUnchanged:true,completedAt:new Date().toISOString(),cases:cases.map(syntheticCaseMetadata),sourceHashes:{[runner]:hash('old runner'),'policy.mjs':hash('frozen policy')},resultsHash:hash(prefix),completed:2,transport:{version:'test'}};
  const args={from,sourceRoot,cases,repeat:2,policyVersion:'test-v1',request,sourceHashes:{...summary.sourceHashes,'scripts/lib/screening-resume.mjs':hash('new helper')}};
  const save=async(s=summary,p=prefix)=>{await writeFile(join(from,'summary.json'),JSON.stringify(s));await writeFile(join(from,'results.jsonl'),p);await writeFile(join(from,'request.json'),JSON.stringify(request));};
  await save();
  const plan=await syntheticContinuation(args);
  assert.equal(plan.prefix,prefix);assert.deepEqual(plan.rows,rows);assert.deepEqual(plan.jobs.map(j=>[j.c.name,j.run]),[['b',1],['a',2]]);
  assert.equal(plan.continuation.completedFailuresRetained,1);assert.equal(plan.continuation.sourceChanges.length,0);assert.deepEqual(plan.previousTransport,summary.transport);checks+=6;
  const newPlan=await syntheticContinuation({...args,from:undefined,sourceRoot:undefined});assert.equal(newPlan.jobs.length,4);assert.equal(newPlan.rows.length,0);checks+=2;
  const reject=async(overrides={},old=summary,p=prefix)=>{await save(old,p);await assert.rejects(()=>syntheticContinuation({...args,...overrides}));checks++;};
  await reject({sourceRoot:undefined});
  await reject({cases:[cases[0],cases[0]]});
  await reject({request:{...request,instructions:'Changed'}});
  await reject({policyVersion:'test-v2'});
  await reject({repeat:1});
  await reject({cases:cases.map(c=>({...c,accept:['hold']}))});
  await reject({cases:cases.map(c=>({...c,turns:['Changed caller']}))});
  await reject({}, {...summary,model:'another-model'});
  await reject({}, {...summary,effort:'low'});
  await reject({}, {...summary,provider:'another-provider'});
  await reject({}, {...summary,sourcesUnchanged:false});
  await reject({}, {...summary,completedAt:undefined});
  await reject({}, {...summary,approvalReview:{requestHash:'changed-review'}});
  await reject({sourceHashes:{...args.sourceHashes,'policy.mjs':hash('changed')}});
  await reject({sourceHashes:{...args.sourceHashes,[runner]:hash('unreviewed runner')}});
  const missing={...args.sourceHashes};delete missing['policy.mjs'];await reject({sourceHashes:missing});
  await reject({}, {...summary,resultsHash:'wrong'});
  await reject({}, {...summary,completed:1});
  for(const changed of [
    [rows[0],rows[0]],
    [{...rows[0],case:'unknown'},rows[1]],
    [{...rows[0],run:3},rows[1]],
    [{...rows[0],category:'legitimate'},rows[1]],
    [{...rows[0],focus:'changed'},rows[1]],
    [{...rows[0],caution:true},rows[1]],
  ]){const p=changed.map(r=>JSON.stringify(r)+'\n').join('');await reject({}, {...summary,resultsHash:hash(p)},p);}
  const noNewline=prefix.trimEnd();await reject({}, {...summary,resultsHash:hash(noNewline)},noNewline);
  await writeFile(join(sourceRoot,'policy.mjs'),'modified original');await reject();
  console.log(JSON.stringify({passed:true,checks,externalInference:false,scope:'Missing case/run scheduling, exact failed prefix preservation, source/request/fixture/label/transport metadata validation.'}));
} finally {await rm(root,{recursive:true,force:true});}
