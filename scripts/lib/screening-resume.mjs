// Resume immutable evaluations without rerunning completed outcomes.
// No inference, scoring exceptions, caller logging or outcome replacement.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const key=(name,run)=>JSON.stringify([name,run]);
const clean=value=>JSON.parse(JSON.stringify(value));
// Audited bookkeeping-only migration for the interrupted v154 batch. Any other
// runner change must start a distinct evaluation instead of mixing results.
const runnerMigrations={
 'scripts/check-screening-observations.mjs':{
  original:'beb9eb7dcfe6b1da5b134406fd9233d59fee193a6b615de4dfe807ebcb505e33',
  current:'b9f51d0f9bcceae7f9e0cf7a0c1d1250cd1b614e32f70370e6b0614de844802c',
 },
 'scripts/check-public-screening-observations.mjs':{
  original:'1167827051682207bea6b1d70d9f03f3ddd8cee939b122d9fe77eb91f6a10f42',
  current:'23120789828b5fafd62cc45f10f7b9dc15994cec6607ca4b4ead4dbaabc79e0c',
 },
};
export const syntheticCaseMetadata=c=>clean({name:c.name,category:c.category,focus:c.focus,accept:c.accept,caution:!!c.caution,expectedSteps:c.expectedSteps,inputHash:hash(JSON.stringify(c.turns))});

export async function verifyContinuationSources({original,sourceRoot,current}){
 const sourceChanges=[];
 for(const [file,digest]of Object.entries(original)){
  assert.equal(hash(await readFile(resolve(sourceRoot,file))),digest,`original_source_changed:${file}`);
  assert.ok(Object.hasOwn(current,file),`current_source_missing:${file}`);
  if(current[file]!==digest){
   // This version adds continuation bookkeeping only. Every decision, input,
   // fixture, transport and scoring dependency must remain byte-identical.
   const migration=runnerMigrations[file];assert.ok(migration,`continuation_source_changed:${file}`);
   assert.equal(digest,migration.original,'unreviewed_original_runner');
   assert.equal(current[file],migration.current,'unreviewed_current_runner');
   sourceChanges.push({file,originalHash:digest,currentHash:current[file]});
  }
 }
 return sourceChanges;
}

export async function syntheticContinuation({from,sourceRoot,cases,repeat,policyVersion,request,sourceHashes,reviewRequestHash}){
 assert.equal(!!from,!!sourceRoot,'continuation_requires_original_source_root');
 assert.equal(new Set(cases.map(c=>c.name)).size,cases.length,'duplicate_case_names');
 const jobs=Array.from({length:repeat},(_,i)=>cases.map(c=>({c,run:i+1}))).flat();
 if(!from)return {prefix:'',rows:[],jobs};
 const summaryBytes=await readFile(resolve(from,'summary.json')),old=JSON.parse(summaryBytes);
 assert.equal(old.policyVersion,policyVersion);assert.equal(old.requestHash,hash(JSON.stringify(request)));
 assert.deepEqual(JSON.parse(await readFile(resolve(from,'request.json'))),request);
 assert.equal(old.approvalReview?.requestHash,reviewRequestHash);
 assert.equal(old.provider,'codex');assert.equal(old.model,'gpt-6-luna');assert.equal(old.effort,'medium');
 assert.equal(old.repeat,repeat);assert.equal(old.planned,jobs.length);assert.equal(old.sourcesUnchanged,true);
 assert.ok(typeof old.completedAt==='string'&&Number.isFinite(Date.parse(old.completedAt)));
 assert.deepEqual(old.cases,cases.map(syntheticCaseMetadata));
 const sourceChanges=await verifyContinuationSources({original:old.sourceHashes,sourceRoot,current:sourceHashes});
 const prefix=await readFile(resolve(from,'results.jsonl'),'utf8');assert.equal(hash(prefix),old.resultsHash);
 assert.ok(!prefix||prefix.endsWith('\n'),'incomplete_result_line');
 const rows=prefix.trim()?prefix.trim().split('\n').map(JSON.parse):[];
 assert.equal(rows.length,old.completed);assert.ok(rows.length<jobs.length,'nothing_remains');
 const seen=new Set(),byName=new Map(cases.map(c=>[c.name,c]));
 for(const row of rows){
  const c=byName.get(row.case);assert.ok(c,'unknown_completed_case');
  assert.ok(Number.isInteger(row.run)&&row.run>=1&&row.run<=repeat,'invalid_completed_run');
  const id=key(row.case,row.run);assert.ok(!seen.has(id),'duplicate_completed_identity');seen.add(id);
  assert.equal(row.category,c.category);assert.equal(row.focus,c.focus);assert.equal(!!row.caution,!!c.caution);
 }
 const remaining=jobs.filter(j=>!seen.has(key(j.c.name,j.run)));
 assert.equal(remaining.length,jobs.length-rows.length);
 return {prefix,rows,jobs:remaining,previousTransport:old.transport,continuation:{version:1,source:resolve(from),sourceRoot:resolve(sourceRoot),originalSummaryHash:hash(summaryBytes),prefixHash:hash(prefix),prefixBytes:Buffer.byteLength(prefix),completedPrefixRows:rows.length,remainingInputs:remaining.length,completedFailuresRetained:rows.filter(r=>r.failure).length,sourceChanges,originalRowsUnmodified:true}};
}
