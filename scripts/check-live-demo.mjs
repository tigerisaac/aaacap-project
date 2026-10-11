import { liveScreeningCases } from './fixtures/live-screening-cases.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { WebSocket } from 'ws';
import { Client, connect, project } from './firebase-client.mjs';
import { ScreeningSession, audiblePCMU } from '../dist/live/session.js';
import { SCREENING_POLICY_VERSION } from '../dist/live/policy.js';
import { DECISION_MODEL, researchScamPattern } from '../dist/live/research.js';

// Generated actors only. Never feed customer recordings into this diagnostic.
// Voices rotate across accents and ages so recognition is not tuned to a single synthetic speaker.
const VOICES = ['Samantha', 'Daniel', 'Karen', 'Moira', 'Aman', 'Grandpa (English (US))', 'Grandma (English (US))', 'Eddy (English (US))'];
const cases = liveScreeningCases;
// --caution screens as production does in the 24 hours after a stopped scam. Its results go to a separate folder,
// so they never stand in for the normal results enable-live-demo.mjs requires.
const caution=process.argv.includes('--caution'), name=process.argv.slice(2).find(a=>!a.startsWith('--'));
const out=caution?'artifacts/live-eval-caution':'artifacts/live-eval';
const selected = name ? cases.filter(c=>c.name===name) : cases;
if(!selected.length) throw new Error('unknown_case');
await connect(); const secrets=new Client({urlPrefix:'https://secretmanager.googleapis.com',apiVersion:'v1'});
const stored=(await secrets.get(`/projects/${project}/secrets/SHIELD_OPENAI_API_KEY/versions/latest:access`)).body;
const key=Buffer.from(stored.payload.data,'base64').toString();
await mkdir(out,{recursive:true});
function rawWav(data){let offset=12;while(offset+8<data.length){const name=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4);if(name==='data')return data.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}throw new Error('wav_data_missing');}
async function speak(text,voice,prefix){
 execFileSync('/usr/bin/say',['-v',voice,'-o',`${prefix}.aiff`,text]);
 execFileSync('/usr/bin/afconvert',['-f','WAVE','-d','ulaw@8000','-c','1',`${prefix}.aiff`,`${prefix}.wav`]);
 return rawWav(await readFile(`${prefix}.wav`));
}
for(const scenario of selected){
 const voice=VOICES[cases.indexOf(scenario)%VOICES.length];
 let input=scenario.text?await speak(scenario.text,voice,`/tmp/shield-eval-${scenario.name}`):Buffer.alloc(0);
 // The scripted answer is spoken only after Shield finishes asking something, as a real caller would.
 let followup=scenario.followup?await speak(scenario.followup,voice,`/tmp/shield-eval-${scenario.name}-followup`):undefined;
 const begin=Date.now(), received=[], transcript=[], assistantTranscript=[]; let decision,output=[],timer,tick,feed,doneResolve;
 let lastAssistantSound=0,assistantSpokeSinceCaller=false,callerDoneAt,answered=false,decidedAt;
 const done=new Promise(resolve=>doneResolve=resolve);
 const ws=new WebSocket('wss://api.openai.com/v1/live/sessions',{headers:{Authorization:`Bearer ${key}`},handshakeTimeout:5000,followRedirects:false});
 const session=new ScreeningSession({
  research:topic=>researchScamPattern(topic,key),
  openai:event=>{if(ws.readyState===1)ws.send(JSON.stringify(event));},
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
  if(e.type==='error')console.log(JSON.stringify({case:scenario.name,error:e.error?.code,message:String(e.error?.message??'').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,300),afterDecision:decision!==undefined}));
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
  elapsedMs:Date.now()-begin,audioBytes:Buffer.concat(output).length,transcript:transcript.join(''),assistantTranscript:assistantTranscript.join(''),eventCounts:received.filter(e=>typeof e==='string').reduce((counts,type)=>(counts[type]=(counts[type]??0)+1,counts),{}),events:received.filter(e=>typeof e!=='string')};
 await writeFile(`${out}/${scenario.name}.json`,JSON.stringify({...result,caution},null,2));
 console.log(JSON.stringify({...result,transcript:undefined,assistantTranscript:undefined,events:undefined,eventCounts:undefined}));
 if(!result.passed)process.exitCode=1;
}
