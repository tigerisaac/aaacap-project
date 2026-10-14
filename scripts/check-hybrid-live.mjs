// Synthetic audio through the actual production class. No Telnyx, Firestore writes or phones.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {WebSocket} from 'ws';
import {HybridScreeningSession,HYBRID_SCREENING_VERSION} from '../dist/live/hybrid.js';
import {audiblePCMU} from '../dist/live/session.js';
import {SCREENING_POLICY_VERSION,liveSessionConfig} from '../dist/live/policy.js';
import {providerKey} from './lib/screening-target.mjs';
import {estimateHybridCost} from './lib/hybrid-cost.mjs';
import {hybridPrototypeCases} from './fixtures/hybrid-prototype-cases.mjs';
import {hybridReleaseCases} from './fixtures/hybrid-release-cases.mjs';
import {liveScreeningCases} from './fixtures/live-screening-cases.mjs';
const args=process.argv.slice(2),option=k=>{const i=args.indexOf(k);return i<0?undefined:args.splice(i,2)[1];};
const suite=option('--suite'),out=option('--out'),audioFrom=option('--audio-from'),prepare=args.includes('--prepare'),run=args.includes('--run');
assert.ok(['prototype','fresh','main'].includes(suite)&&/^artifacts\/hybrid-live-[a-z0-9-]+$/.test(out??''));
assert.ok(prepare!==run&&args.every(a=>['--prepare','--run','--allow-paid-audio'].includes(a)));
assert.ok(!run||args.includes('--allow-paid-audio'));
const cases=suite==='prototype'?hybridPrototypeCases.map(c=>({name:c.id,text:c.opening,followup:c.answer,questionPattern:c.questionPattern,voice:c.voice,accept:[c.expected],category:c.category==='ordinary'?'legit':'scam',mustQuestion:true}))
  :suite==='main'?liveScreeningCases:hybridReleaseCases;
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=['scripts/check-hybrid-live.mjs','scripts/fixtures/hybrid-release-cases.mjs','scripts/fixtures/hybrid-prototype-cases.mjs','scripts/fixtures/live-screening-cases.mjs',
  'backend/src/live/policy.ts',...['hybrid','hybrid-policy','hybrid-gate','session','policy','timing','acknowledgement','decision-progress','evidence','research'].map(n=>`dist/live/${n}.js`)];
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async f=>[f,sha(await readFile(f))])));
const sourceHashes=await hashes();
const plan={suite,policy:SCREENING_POLICY_VERSION,hybrid:HYBRID_SCREENING_VERSION,cases,sourceHashes,requestHash:sha(JSON.stringify(liveSessionConfig()))};
const voices=['Samantha','Daniel','Karen','Moira','Aman','Grandpa (English (US))','Grandma (English (US))','Eddy (English (US))'];
if(prepare){
 if(audioFrom){assert.ok(/^artifacts\/hybrid-live-[a-z0-9-]+$/.test(audioFrom));assert.deepEqual(JSON.parse(await readFile(`${audioFrom}/plan.json`)).cases,cases);}
 await mkdir(out,{recursive:false});
 for(const [i,c] of cases.entries())for(const [part,text]of[['opening',c.text],['answer',c.followup]])if(text){
  const prefix=`${out}/${c.name}-${part}`;
  if(audioFrom)await copyFile(`${audioFrom}/${c.name}-${part}.pcmu`,`${prefix}.pcmu`);
  else if(suite==='prototype')await copyFile(`artifacts/hybrid-prototype-v158-2026-10-13-audiofix/${c.name}-${part}.pcmu`,`${prefix}.pcmu`);
  else{execFileSync('/usr/bin/say',['-v',c.voice??voices[i%voices.length],'-r','165','-o',`${prefix}.aiff`,text]);execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',`${prefix}.aiff`,'-ar','8000','-ac','1','-f','mulaw',`${prefix}.pcmu`]);}
  const b=await readFile(`${prefix}.pcmu`);assert.ok(b.length>=8000&&audiblePCMU(b),'empty_caller_audio');
 }
 const names=cases.flatMap(c=>[...(c.text?[`${c.name}-opening.pcmu`]:[]),...(c.followup?[`${c.name}-answer.pcmu`]:[])]);
 plan.audioHashes=Object.fromEntries(await Promise.all(names.map(async f=>[f,sha(await readFile(`${out}/${f}`))])));
 await writeFile(`${out}/plan.json`,JSON.stringify(plan,null,2),{flag:'wx'});console.log(JSON.stringify({prepared:cases.length,out,paidInference:false}));process.exit(0);
}
const {audioHashes,...frozen}=JSON.parse(await readFile(`${out}/plan.json`));assert.deepEqual(frozen,plan);
for(const[f,h]of Object.entries(audioHashes))assert.equal(sha(await readFile(`${out}/${f}`)),h);
await writeFile(`${out}/started.json`,JSON.stringify({at:new Date().toISOString()}),{flag:'wx'});
process.loadEnvFile('.env.speech');const keys={openai:await providerKey('openai'),soniox:process.env.SONIOX_API_KEY};assert.ok(keys.soniox);
const ack=await readFile('backend/src/live/ack-audio/one-moment.pcmu');
function wav(events,duration){
 const samples=new Int32Array(Math.ceil(duration*8));
 for(const e of events){const start=Math.round(e.ms*8);for(let i=0;i<e.audio.length&&start+i<samples.length;i++){
  const u=~e.audio[i]&255,m=(((u&15)<<3)+132)<<(u>>4&7);samples[start+i]+=(u&128)?132-m:m-132;
 }}
 const data=Buffer.alloc(samples.length*2);for(let i=0;i<samples.length;i++)data.writeInt16LE(Math.max(-32768,Math.min(32767,samples[i])),i*2);
 const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(8000,24);h.writeUInt32LE(16000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);
}
async function simulate(c){
 const opening=c.text?await readFile(`${out}/${c.name}-opening.pcmu`):Buffer.alloc(0),answer=c.followup?await readFile(`${out}/${c.name}-answer.pcmu`):undefined;
 const start=Date.now(),clock=()=>Date.now()-start,events=[],audio=[],usage=[],sockets=[];
 let actual,decision,doneResolve,ticker,terminalMs,openingEnd,answerEnd,firstQuestionMs,lastSound=0,assistant='',caller='',answered=false,question,questionMatched=false,position=-2800,answerPosition=0,chunk=1;
 const done=new Promise(r=>doneResolve=r);
 const session=new HybridScreeningSession({
  acknowledgementAudio:ack, transcript:(speaker,delta)=>{if(speaker==='caller')caller+=delta;else assistant+=delta;},
  timing:(type,fields)=>{events.push({type,ms:clock(),...fields});if(type==='response_usage')usage.push({stage:fields.initialAssessment?'initial':'live',...fields});},
  telnyx:e=>{if(e.event==='media'){const b=Buffer.from(e.media.payload,'base64');audio.push({ms:clock(),audio:b});if(audiblePCMU(b)&&assistant.trim()){lastSound=clock();firstQuestionMs??=clock();}}},
  finish:async d=>{decision=d;actual=typeof d==='string'?d:d.action;terminalMs=clock();},
  close:()=>{clearInterval(ticker);terminalMs??=clock();setTimeout(doneResolve,1700);}
 },keys,{}, {socket:(kind,key)=>{
  const s={kind,opened:undefined,closed:undefined};sockets.push(s);
  const ws=new WebSocket(kind==='soniox'?'wss://stt-rt.soniox.com/transcribe-websocket':'wss://api.openai.com/v1/live/sessions',{headers:{Authorization:`Bearer ${key}`},handshakeTimeout:5000,maxPayload:1_000_000,followRedirects:false,perMessageDeflate:false});
  ws.on('open',()=>s.opened=clock());ws.on('close',()=>s.closed=clock());return ws;
 }});
 session.start();
 ticker=setInterval(()=>{
  if(session.ended)return;
  const b=Buffer.alloc(160,255);
  if(position<opening.length){if(position>=0)opening.copy(b,0,position,Math.min(position+160,opening.length));position+=160;if(position>=opening.length)openingEnd=clock();}
  else if(answered&&answerPosition<answer.length){answer.copy(b,0,answerPosition,Math.min(answerPosition+160,answer.length));answerPosition+=160;if(answerPosition>=answer.length)answerEnd=clock();}
  else if(answer&&!answered&&lastSound&&clock()-lastSound>=900&&/\?/.test(assistant)){
   question=assistant.trim();questionMatched=new RegExp(c.questionPattern??'who|what|about|calling|name|need|do|tell','i').test(question);
   if(questionMatched){answered=true;events.push({type:'actor_answer_started',ms:clock()});}else void session.stop('screening_unavailable');
  }
  audio.push({ms:clock(),audio:b});session.input(chunk++,b.toString('base64'));session.tick();
 },20);
 const hard=setTimeout(()=>void session.stop('screening_timeout'),78000);await done;clearTimeout(hard);
 const duration=terminalMs+400;
 const row={name:c.name,category:c.category,accept:c.accept,actual,passed:c.accept.includes(actual)&&(!c.mustQuestion||(answered&&questionMatched)),decision,
  answered,question,questionMatched,callerTranscript:caller,assistantTranscript:assistant,openingEndMs:openingEnd,answerEndMs:answerEnd,
  firstQuestionAfterOpeningMs:firstQuestionMs==null||openingEnd==null?null:firstQuestionMs-openingEnd,
  liveUsed:sockets.some(s=>s.kind==='live'),durationMs:duration,
  liveDurationMs:sockets.filter(s=>s.kind==='live').reduce((n,s)=>n+(s.opened===undefined?0:(s.closed??clock())-s.opened),0),
  sonioxDurationMs:sockets.filter(s=>s.kind==='soniox').reduce((n,s)=>n+(s.opened===undefined?0:(s.closed??clock())-s.opened),0),usage,events};
 row.estimatedCostUSD=estimateHybridCost(row);await writeFile(`${out}/${c.name}.wav`,wav(audio,duration),{flag:'wx'});
 await writeFile(`${out}/${c.name}.json`,JSON.stringify(row,null,2),{flag:'wx'});
 console.log(JSON.stringify({name:c.name,actual,passed:row.passed,liveUsed:row.liveUsed,questionDelayMs:row.firstQuestionAfterOpeningMs,costUSD:row.estimatedCostUSD.total}));return row;
}
const results=[];let next=0;async function worker(){while(next<cases.length){const c=cases[next++];results.push(await simulate(c));}}
await Promise.all([worker(),worker()]);assert.deepEqual(await hashes(),sourceHashes,'source_changed_during_run');
results.sort((a,b)=>cases.findIndex(c=>c.name===a.name)-cases.findIndex(c=>c.name===b.name));
const summary={suite,policy:SCREENING_POLICY_VERSION,hybrid:HYBRID_SCREENING_VERSION,sourceUnchanged:true,completed:results.length,passed:results.filter(r=>r.passed).length,
 ordinaryOffered:results.filter(r=>r.category==='legit'&&r.actual==='approve').length,ordinarySaved:results.filter(r=>r.category==='legit'&&r.actual==='message').length,
 harmfulStopped:results.filter(r=>['scam','robocall'].includes(r.category)&&['block','hold'].includes(r.actual)).length,
 harmfulApproved:results.filter(r=>['scam','robocall'].includes(r.category)&&r.actual==='approve').length,
 costUSD:results.reduce((n,r)=>n+r.estimatedCostUSD.total,0),results:results.map(({usage,events,callerTranscript,assistantTranscript,...r})=>r)};
await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2),{flag:'wx'});console.log(JSON.stringify({...summary,results:undefined}));
if(summary.passed!==cases.length)process.exitCode=1;
