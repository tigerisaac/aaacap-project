import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cases, estimate } from './call-lab/plan.mjs';
import { routes, Tickets, browserRequest } from './call-lab/metadata.mjs';
import { createSimulator } from './call-lab/simulator.mjs';

const command=process.argv[2]??'plan';
const packagePath=resolve('artifacts/private/backend-reliability-release/api');
try {
  if(!['plan','run','serve'].includes(command))throw Error('supported_commands_plan_run_serve');
  if(command==='plan')console.log(JSON.stringify({mode:'offline',realCallingEnabled:false,...estimate()},null,2));
  else if(!process.argv.includes('--inside')) {
    if(process.env.FIRESTORE_EMULATOR_HOST)throw Error('use_the_dedicated_lab_emulator');
    const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--config','scripts/call-lab/firebase.json','--only','firestore','--project','demo-shield-call-lab',`node scripts/call-lab.mjs ${command} --inside`],
      {stdio:'inherit',env:{...process.env,GCLOUD_PROJECT:'demo-shield-call-lab',METADATA_SERVER_DETECTION:'none'}});
    child.on('error',()=>{console.error('Unable to start the local emulator.');process.exitCode=1;});
    child.on('exit',code=>{process.exitCode=code??1;});
  }else {
    const lab=await createSimulator(packagePath);
    const save=async report=>{await mkdir('artifacts/private/call-lab',{recursive:true,mode:0o700});await writeFile('artifacts/private/call-lab/latest.json',JSON.stringify(report,null,2),{mode:0o600});await rm('artifacts/private/call-lab/error.txt',{force:true});};
    if(command==='run'){try{const report=await lab.run();await save(report);console.log(JSON.stringify(report,null,2));}finally{await lab.close();}}
    else {
      const tickets=new Tickets(),assets={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
      const server=createServer(async(req,res)=>{
        res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
        const origin=`http://127.0.0.1:${server.address().port}`;
        const json=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
        try {
          if(req.headers.host!==new URL(origin).host)return json(403,{error:'localhost_required'});
          if(req.method==='GET'&&assets[req.url]){const [name,type]=assets[req.url];res.writeHead(200,{'content-type':type});return res.end(await readFile(new URL('./call-lab/web/'+name,import.meta.url)));}
          if(req.method==='GET'&&req.url==='/config')return json(200,{cases:cases.map(({id,title})=>({id,title})),routes:routes.map(({alias})=>({alias})),plan:estimate(),realCallingEnabled:false,release:lab.release.deployedApi});
          if(req.method!=='POST'||!['/run','/preview'].includes(req.url))return json(404,{error:'not_found'});
          if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'same_origin_required'});
          let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return json(413,{error:'request_too_large'});}
          const body=JSON.parse(raw);
          if(req.url==='/preview'){const request=browserRequest(body.alias,tickets);return json(200,{recipient:body.alias,destination:request.destinationNumber,headers:request.customHeaders.map(h=>h.name),signed:true,expiresSeconds:120,realCalls:0,note:'A separate test adapter maps this signed tag to a fictional recipient. Production does not accept this tag.'});}
          const report=await lab.run(body.case,body.alias);await save(report);return json(200,report);
        }catch(e){return json(e.message==='lab_busy'?409:400,{error:/^[a-z_]+$/.test(e.message)?e.message:'rehearsal_failed'});}
      });
      await new Promise(done=>server.listen(0,'127.0.0.1',done));
      console.log(`Call lab: http://127.0.0.1:${server.address().port} (local simulation; real calling disabled)`);
      const close=()=>server.close(()=>{void lab.close().then(()=>process.exit(0));});process.once('SIGINT',close);process.once('SIGTERM',close);
    }
  }
}catch(e){await mkdir('artifacts/private/call-lab',{recursive:true,mode:0o700});await writeFile('artifacts/private/call-lab/error.txt',e.stack??String(e),{mode:0o600});console.error(JSON.stringify({failed:true,reason:/^[a-z_:./-]+$/.test(e.message)?e.message:'call_lab_failed',diagnostics:'artifacts/private/call-lab/error.txt'}));process.exitCode=1;}
