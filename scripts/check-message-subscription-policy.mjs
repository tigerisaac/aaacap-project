// Offline subscription evaluation of production or an explicitly frozen post-call request.
// Fixtures supply text in memory; results never store transcripts, quotes or summaries.
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {decisionRequest,voicemailAssessmentSchema,voicemailVerdict,VOICEMAIL_POLICY_VERSION} from '../dist/cloud/voicemail-check.js';
import {safeMessageSummary} from '../dist/cloud/message-summary.js';
import {supportedEvidence} from '../dist/live/evidence.js';
import {digest} from './lib/public-scam-benchmark.mjs';
import {codexMessageTarget} from './lib/codex-message-target.mjs';
const args=process.argv.slice(2),option=(key,def)=>{const i=args.indexOf(key);return i<0?def:args.splice(i,2)[1];};
const fixtureFile=option('--cases'),out=option('--out'),frozenFile=option('--request'),policyVersion=option('--policy-version',VOICEMAIL_POLICY_VERSION),concurrency=Number(option('--concurrency','6'));
assert.ok(!args.length&&fixtureFile&&out&&Number.isInteger(concurrency)&&concurrency>0&&concurrency<=10);
const fixture=await import(pathToFileURL(resolve(fixtureFile)).href),cases=fixture.messageCases;
assert.ok(cases?.length);assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);assert.ok(cases.every(c=>typeof c.text==='string'&&['keep','remove'].includes(c.expected)));
const production=decisionRequest(''),base=frozenFile?JSON.parse(await readFile(frozenFile,'utf8')):production;
// Only instruction changes are supported; the production input/schema/transport stay intact.
assert.deepEqual({...base,instructions:production.instructions},production);
const requestFor=text=>({...structuredClone(base),input:decisionRequest(text).input});
const files=[fixtureFile,...(frozenFile?[frozenFile]:[]),'scripts/check-message-subscription-policy.mjs','scripts/check-message-subscription.mjs','scripts/lib/codex-message-target.mjs','scripts/lib/codex-screening-target.mjs','scripts/lib/screening-codex-models.json','dist/cloud/voicemail-check.js','dist/cloud/message-summary.js','dist/live/evidence.js',...(fixture.sourceFiles??[])];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,digest(await readFile(p))]))),sourceHashes=await hashes();
await mkdir(out,{recursive:true});await writeFile(`${out}/results.jsonl`,'',{flag:'wx'});
const target=await codexMessageTarget(),rows=[];let cursor=0,writes=Promise.resolve(),stopped=false;
try{
 const manifest={startedAt:new Date().toISOString(),provider:'codex',model:base.model,effort:base.reasoning.effort,policyVersion,frozenRequest:frozenFile,transport:target.transport,sourceHashes,requestShapeHash:digest(JSON.stringify(base)),planned:cases.length,concurrency,
 cases:cases.map(c=>({id:c.id,group:c.group,expected:c.expected,sourceHash:c.sourceHash,inputHash:digest(c.text),requestHash:digest(JSON.stringify(requestFor(c.text)))})),interpretation:'One post-call text assessment per unique selected input, no output-based retry. Failed or unsupported removals keep the message as in production. No transcription, storage or real-call execution.'};
 await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
 async function worker(){while(!stopped&&cursor<cases.length){const c=cases[cursor++],start=Date.now(),response=await target.evaluate(requestFor(c.text)),parsed=voicemailAssessmentSchema.safeParse(response.output),assessment=parsed.success?parsed.data:undefined,
 failure=response.failure??(!parsed.success?'invalid_assessment':undefined),verdict=voicemailVerdict({transcript:c.text,duration:30,assessment}),actual=verdict==='keep'?'keep':'remove',row={id:c.id,group:c.group,expected:c.expected,inputHash:digest(c.text),actual,verdict,clear:assessment?.clear??false,evidenceSupported:!!assessment&&supportedEvidence(assessment.evidence,c.text),summaryAvailable:verdict==='keep'&&!!safeMessageSummary(assessment?.summary),failure,passed:!failure&&actual===c.expected,elapsedMs:Date.now()-start};
 rows.push(row);writes=writes.then(()=>appendFile(`${out}/results.jsonl`,`${JSON.stringify(row)}\n`));if(failure&&failure!=='codex_evaluation_timeout'&&failure!=='invalid_assessment')stopped=true;if(rows.length%50===0||stopped)console.log(JSON.stringify({completed:rows.length,planned:cases.length,stopped}));}}
 await Promise.all(Array.from({length:concurrency},worker));await writes;assert.deepEqual(await hashes(),sourceHashes);
 const byGroup=Object.fromEntries([...new Set(cases.map(c=>c.group))].map(group=>{const rs=rows.filter(r=>r.group===group);return [group,{total:rs.length,passed:rs.filter(r=>r.passed).length,kept:rs.filter(r=>r.actual==='keep').length,removed:rs.filter(r=>r.actual==='remove').length,failures:rs.filter(r=>r.failure).length}];}));
 const summary={...manifest,completedAt:new Date().toISOString(),completed:rows.length,stopped,sourcesUnchanged:true,resultHash:digest(await readFile(`${out}/results.jsonl`)),byGroup,failures:rows.filter(r=>r.failure).length};
 await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});console.log(JSON.stringify({completed:rows.length,planned:cases.length,byGroup,failures:summary.failures}));if(stopped||rows.length!==cases.length||summary.failures)process.exitCode=1;
}finally{await target.close();}
