import { WebSocket } from 'ws';
import { connect, Client, project } from './firebase-client.mjs';
import { liveSessionConfig } from '../dist/live/policy.js';
await connect();
const secrets = new Client({urlPrefix:'https://secretmanager.googleapis.com',apiVersion:'v1'});
const value=(await secrets.get(`/projects/${project}/secrets/SHIELD_OPENAI_API_KEY/versions/latest:access`)).body;
const key=Buffer.from(value.payload.data,'base64').toString('utf8');
const ws=new WebSocket('wss://api.openai.com/v1/live/sessions',{headers:{Authorization:`Bearer ${key}`},handshakeTimeout:5000,followRedirects:false});
let timer,started=false,audioBytes=0,interval;
const done=new Promise(resolve=>{
 const hard=setTimeout(()=>{ws.terminate();resolve();},12000);
 ws.on('open',()=>ws.send(JSON.stringify({type:'session.start',session:liveSessionConfig()})));
 ws.on('message',raw=>{const e=JSON.parse(raw.toString());
  if(e.type==='session.started'){
   started=true;console.log(JSON.stringify({sessionStarted:true,model:e.session.model}));
   interval=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'session.input_audio.append',audio:Buffer.alloc(160,255).toString('base64')}));},20);
   timer=setTimeout(()=>{clearInterval(interval);if(ws.readyState===1)ws.send(JSON.stringify({type:'session.close'}));},4000);
  }else if(e.type==='session.output_audio.delta')audioBytes+=Buffer.from(e.delta,'base64').length;
  else if(e.type==='error'){console.log(JSON.stringify({error:e.error?.code,message:String(e.error?.message??'').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]')}));ws.close();}
  else if(e.type==='session.closed'){console.log(JSON.stringify({closed:true,audioBytes}));ws.close();}
 });
 ws.on('error',()=>{console.log(JSON.stringify({websocketFailed:true}));});
 ws.on('close',()=>{clearTimeout(hard);clearTimeout(timer);clearInterval(interval);resolve();});
});
await done;if(!started)process.exitCode=1;
