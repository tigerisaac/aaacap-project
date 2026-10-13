// Subscription-only structured-output transport for offline message-policy checks.
// Codex owns authentication. No account tokens, transcript logs or application writes.
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {codexArgs} from './codex-screening-target.mjs';

export async function codexMessageTarget({extraConfig={}}={}) {
  if (!Object.keys(extraConfig).length) {
    const output=execFileSync(process.execPath,[fileURLToPath(new URL('../check-message-subscription.mjs',import.meta.url))],
      {cwd:'/private/tmp',encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});
    if (!JSON.parse(output.trim()).passed) throw new Error('message_subscription_preflight_failed');
  }
  if(process.platform!=='darwin')throw new Error('message_subscription_isolation_requires_macos');
  const codexHome=process.env.CODEX_HOME??join(homedir(),'.codex');
  const denied=['AGENTS.md','AGENTS.override.md'].map(n=>`(literal ${JSON.stringify(join(codexHome,n))})`).join(' ');
  const child=spawn('/usr/bin/sandbox-exec',['-p',`(version 1)(allow default)(deny file-read-data ${denied})`,'codex',...codexArgs(extraConfig)],{cwd:'/private/tmp',stdio:['pipe','pipe','pipe']});
  // Drain arbitrary provider diagnostics without logging them.
  child.stderr.on('data',()=>{});
  const pending=new Map(),active=new Map();let sequence=0,exited=false,closed=false;
  const send=v=>{if(!exited)child.stdin.write(`${JSON.stringify(v)}\n`);};
  function rpc(method,params){return new Promise((resolve,reject)=>{if(exited){reject(new Error('codex_exited'));return;}const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('codex_rpc_timeout'));},30000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});send({id,method,params});});}
  function failAll(){exited=true;for(const p of pending.values())p.reject(new Error('codex_exited'));pending.clear();for(const a of active.values())void a.finish({failure:'codex_exited'});}
  child.on('error',failAll);child.on('exit',failAll);child.stdin.on('error',failAll);
  createInterface({input:child.stdout}).on('line',line=>{
    let m;try{m=JSON.parse(line);}catch{return;}
    if(m.id!==undefined&&!m.method){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error('codex_rpc_error')):p.resolve(m.result);return;}
    const a=active.get(m.params?.threadId);
    if(m.id!==undefined){send({id:m.id,error:{code:-32601,message:'No tools permitted in message evaluation'}});if(a)void a.finish({failure:'unexpected_tool'});return;}
    if(!a)return;
    if(m.method==='item/completed'&&m.params.item?.type==='agentMessage')a.text+=m.params.item.text??'';
    if(m.method==='turn/completed'){
      if(m.params.turn?.status!=='completed'){void a.finish({failure:'codex_turn_incomplete'});return;}
      try{void a.finish({output:JSON.parse(a.text)});}catch{void a.finish({failure:'invalid_json'});}
    }
  });
  try{await rpc('initialize',{clientInfo:{name:'shield_message_eval',title:'Shield message evaluation',version:'1.0'},capabilities:{experimentalApi:true}});send({method:'initialized',params:{}});}catch(e){child.kill();throw e;}
  return {
    transport:{kind:'codex-app-server-output-schema',version:1,model:'gpt-6-luna',effort:'medium',promptRole:'developer',context:'Frozen message instructions, production user input and output schema only; no tools. Verified by local mock.',differencesFromResponses:'Codex uses low verbosity, its own output limit and an offline 90-second evaluation deadline. This is not production latency or a transcription test.'},
    async evaluate(request,{signal}={}){
      if(request.model!=='gpt-6-luna'||request.reasoning?.effort!=='medium'||request.store!==false||request.text?.format?.type!=='json_schema'||request.input?.length!==1||request.input[0].role!=='user'||typeof request.input[0].content!=='string')throw new Error('unexpected_message_request');
      if(signal?.aborted)return {failure:'codex_evaluation_cancelled'};
      let thread;
      try{thread=await rpc('thread/start',{model:request.model,allowProviderModelFallback:false,cwd:'/private/tmp',ephemeral:true,sandbox:'read-only',approvalPolicy:'never',baseInstructions:request.instructions,developerInstructions:'',environments:[],dynamicTools:[]});
        if(thread.model!==request.model||thread.reasoningEffort!=='medium')throw new Error('model_mismatch');
      }catch{return {failure:'codex_thread_start_failed'};}
      const threadId=thread.thread.id;
      if(signal?.aborted){try{await rpc('thread/unsubscribe',{threadId});}catch{}return {failure:'codex_evaluation_cancelled'};}
      return await new Promise(resolve=>{
        let finished=false;
        const onAbort=()=>void a.finish({failure:'codex_evaluation_cancelled'});
        const a={text:'',turnId:null,finish:async result=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',onAbort);active.delete(threadId);if(result.failure&&a.turnId)try{await rpc('turn/interrupt',{threadId,turnId:a.turnId});}catch{}try{await rpc('thread/unsubscribe',{threadId});}catch{}resolve(result);}};
        const timer=setTimeout(()=>void a.finish({failure:'codex_evaluation_timeout'}),90000);active.set(threadId,a);
        signal?.addEventListener('abort',onAbort,{once:true});
        rpc('turn/start',{threadId,model:request.model,effort:'medium',summary:'none',outputSchema:request.text.format.schema,input:[{type:'text',text:request.input[0].content}]}).then(async r=>{a.turnId=r.turn.id;if(finished)try{await rpc('turn/interrupt',{threadId,turnId:a.turnId});}catch{}}).catch(()=>void a.finish({failure:'codex_turn_start_failed'}));
      });
    },
    async close(){if(!closed){closed=true;child.stdin.end();child.kill();}},
  };
}
