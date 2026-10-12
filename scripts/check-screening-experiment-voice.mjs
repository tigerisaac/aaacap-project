import { liveScreeningCases } from './fixtures/live-screening-cases.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { Client, connect, project } from './firebase-client.mjs';
import { ScreeningSession, audiblePCMU } from '../dist/live/session.js';
import { liveSessionConfig } from '../dist/live/policy.js';
import assert from 'node:assert/strict';
import { resolve, relative } from 'node:path';
import { digest } from './lib/public-scam-benchmark.mjs';
import { DECISION_MODEL, researchScamPattern } from '../dist/live/research.js';

// Generated actors only. Never feed customer recordings into this diagnostic.
// Voices rotate across accents and ages so recognition is not tuned to a single synthetic speaker.
const VOICES = ['Samantha', 'Daniel', 'Karen', 'Moira', 'Aman', 'Grandpa (English (US))', 'Grandma (English (US))', 'Eddy (English (US))'];
// Isolated experimental voice runner. Never writes a production deployment gate.
const args=process.argv.slice(2),option=(k)=>{const i=args.indexOf(k);return i<0?undefined:args.splice(i,2)[1];};
const requestPath=option('--request'),outArg=option('--out'),label=option('--label'),casesPath=option('--cases');
const prepare=args.includes('--prepare-only'),paid=args.includes('--allow-paid-voice');
assert.ok(requestPath&&outArg&&label&&args.every(a=>['--prepare-only','--allow-paid-voice'].includes(a)));
assert.ok(prepare!==paid,'Choose prepare-only or explicitly authorized paid voice');
const out=resolve(outArg);assert.ok(relative(resolve('artifacts'),out).startsWith('voice-experiment-'),'Use a new artifacts/voice-experiment-* directory');
assert.ok(!relative(resolve('artifacts'),out).includes('..'));
const request=JSON.parse(await readFile(requestPath,'utf8')),base=liveSessionConfig().delegation.responses;
const withoutInstructions=x=>{const {instructions,...rest}=x;return rest;};
assert.deepEqual(withoutInstructions(request),withoutInstructions(base),'Only decision instructions may differ');
assert.ok(typeof request.instructions==='string'&&request.instructions.length>0);
const cases=casesPath?(await import(pathToFileURL(resolve(casesPath)).href)).liveScreeningCases:liveScreeningCases;
assert.ok(cases.length&&new Set(cases.map(c=>c.name)).size===cases.length);
for(const c of cases)assert.ok(/^[a-zA-Z0-9_-]+$/.test(c.name)&&Array.isArray(c.accept));
const selected=cases,caution=false,SCREENING_POLICY_VERSION=label;
const sourceFiles=['scripts/check-screening-experiment-voice.mjs',requestPath,casesPath??'scripts/fixtures/live-screening-cases.mjs','dist/live/session.js','dist/live/policy.js','dist/live/evidence.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,digest(await readFile(p))])));
const sourceHashes=await hashes();
const plan={label,requestHash:digest(JSON.stringify(request)),sourceHashes,decisionModel:request.model,reasoning:request.reasoning,
  voiceModel:liveSessionConfig().model,scenarios:cases.map(c=>({name:c.name,category:c.category,accept:c.accept,inputHash:digest(JSON.stringify([c.text??'',c.followup??'']))})),
  interpretation:'Synthetic local voices through paid GPT Live with the frozen decision prompt. No Telnyx calls, forwarding, deployment or production gate. Prepared follow-up follows assistant audio; not adaptive human behavior or semantic question validation.'};
if(prepare){await mkdir(out,{recursive:false});await writeFile(`${out}/plan.json`,JSON.stringify(plan,null,2),{flag:'wx'});console.log(JSON.stringify({prepared:true,scenarios:cases.length,label,requestHash:plan.requestHash,paidInference:false}));process.exit(0);}
assert.deepEqual(JSON.parse(await readFile(`${out}/plan.json`,'utf8')),plan,'Prepared plan changed; prepare a new output directory');
await writeFile(`${out}/started.json`,JSON.stringify({startedAt:new Date().toISOString(),requestHash:plan.requestHash}),{flag:'wx'});
await connect(); const secrets=new Client({urlPrefix:'https://secretmanager.googleapis.com',apiVersion:'v1'});
const stored=(await secrets.get(`/projects/${project}/secrets/SHIELD_OPENAI_API_KEY/versions/latest:access`)).body;
const key=Buffer.from(stored.payload.data,'base64').toString();
const results=[];
function rawWav(data){let offset=12;while(offset+8<data.length){const name=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4);if(name==='data')return data.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}throw new Error('wav_data_missing');}
async function speak(text,voice,prefix){
 execFileSync('/usr/bin/say',['-v',voice,'-o',`${prefix}.aiff`,text]);
 execFileSync('/usr/bin/afconvert',['-f','WAVE','-d','ulaw@8000','-c','1',`${prefix}.aiff`,`${prefix}.wav`]);
 return rawWav(await readFile(`${prefix}.wav`));
}
for(const scenario of selected){
 const voice=VOICES[cases.indexOf(scenario)%VOICES.length];
 let input=scenario.text?await speak(scenario.text,voice,`${out}/${scenario.name}`):Buffer.alloc(0);
 // A prepared answer follows assistant audio. This does not establish that a semantic question was asked.
 let followup=scenario.followup?await speak(scenario.followup,voice,`${out}/${scenario.name}-followup`):undefined;
 const begin=Date.now(), received=[], transcript=[], assistantTranscript=[]; let decision,output=[],timer,tick,feed,doneResolve;
 let lastAssistantSound=0,assistantSpokeSinceCaller=false,callerDoneAt,answered=false,decidedAt;
 const done=new Promise(resolve=>doneResolve=resolve);
 const ws=new WebSocket('wss://api.openai.com/v1/live/sessions',{headers:{Authorization:`Bearer ${key}`},handshakeTimeout:5000,followRedirects:false});
 const session=new ScreeningSession({
  research:topic=>researchScamPattern(topic,key),
  openai:event=>{if(event.type==='session.start'){assert.deepEqual(event.session.delegation.responses,base);event={...event,session:{...event.session,delegation:{...event.session.delegation,responses:structuredClone(request)}}};}if(ws.readyState===1)ws.send(JSON.stringify(event));},
  telnyx:event=>{if(event.event!=='media')return;const frame=Buffer.from(event.media.payload,'base64');output.push(frame);
   if(audiblePCMU(frame)){lastAssistantSound=Date.now();if(callerDoneAt!==undefined)assistantSpokeSinceCaller=true;}},
  finish:async d=>{decision=typeof d==='string'?d:d.action;decidedAt=Date.now();},
  close:()=>{clearInterval(feed);clearInterval(tick);clearTimeout(timer);ws.close();doneResolve();}
 },Date.now,{recentScamStopped:caution});
 let frame=1, position=-8000; // Caller responds after the carrier greeting and stream startup.
 ws.on('open',()=>session.start());
 ws.on('message',raw=>{const e=JSON.parse(raw.toString());received.push(e.type);
  if(e.type==='session.input_transcript.delta')transcript.push(e.delta);
  if(e.type==='session.output_transcript.delta')assistantTranscript.push(e.delta);
  if(e.type==='response.event' && e.event?.type==='response.output_item.done' && e.event.item?.type==='function_call')received.push(e.event.item);
  if(e.type==='error')received.push(e.error);
  if(e.type==='session.instructions.appended')received.push({type:e.type,client_event_id:e.client_event_id});
  if(e.type==='error')console.log(JSON.stringify({case:scenario.name,error:e.error?.code,afterDecision:decision!==undefined}));
  session.event(e);
  if(e.type==='session.started'){
   tick=setInterval(()=>session.tick(),20);
   feed=setInterval(()=>{const bytes=Buffer.alloc(160,255);
    if(position>=0&&position<input.length)input.copy(bytes,0,position,Math.min(position+160,input.length));
    position+=160;
    if(input.length&&position>=input.length&&callerDoneAt===undefined)callerDoneAt=Date.now();
    if(followup&&!answered&&assistantSpokeSinceCaller&&Date.now()-lastAssistantSound>=700){answered=true;input=followup;position=0;callerDoneAt=undefined;assistantSpokeSinceCaller=false;}
    session.input(frame++,bytes.toString('base64'));},20);
  }
 });
 ws.on('error',()=>{void session.stop('screening_unavailable');});
 ws.on('close',()=>{if(!session.ended)void session.stop('screening_unavailable');});
 timer=setTimeout(()=>{void session.stop('screening_timeout');ws.terminate();},80_000);
 await done;
 const passed=scenario.accept.includes(decision);
 const result={case:scenario.name,category:scenario.category,voice,decisionModel:DECISION_MODEL,policyVersion:SCREENING_POLICY_VERSION,expected:scenario.expected,accept:scenario.accept,actual:decision,passed,
  answeredFollowup:answered,decisionAfterCallerMs:callerDoneAt!==undefined&&decidedAt?decidedAt-callerDoneAt:undefined,
  elapsedMs:Date.now()-begin,audioBytes:Buffer.concat(output).length,transcriptChars:transcript.join('').length,assistantTranscriptChars:assistantTranscript.join('').length,eventCounts:received.filter(e=>typeof e==='string').reduce((counts,type)=>(counts[type]=(counts[type]??0)+1,counts),{})};
 await writeFile(`${out}/${scenario.name}.json`,JSON.stringify({...result,caution},null,2),{flag:'wx'});results.push(result);
 console.log(JSON.stringify({...result,transcript:undefined,assistantTranscript:undefined,events:undefined,eventCounts:undefined}));
 if(!result.passed)process.exitCode=1;
}

assert.deepEqual(await hashes(),sourceHashes,'Sources changed during voice evaluation');
const ordinary=results.filter(r=>r.category==='legit'),harmful=results.filter(r=>r.category==='scam');
await writeFile(`${out}/summary.json`,JSON.stringify({label,requestHash:plan.requestHash,completed:results.length,planned:cases.length,sourcesUnchanged:true,passed:results.filter(r=>r.passed).length,ordinaryOffered:{passed:ordinary.filter(r=>r.actual==='approve').length,total:ordinary.length},harmfulStopped:{passed:harmful.filter(r=>['block','hold'].includes(r.actual)).length,total:harmful.length},results},null,2),{flag:'wx'});
