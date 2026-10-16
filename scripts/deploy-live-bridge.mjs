import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Client, connect, project } from './firebase-client.mjs';

const region = 'us-central1', parent = `/projects/${project}/locations/${region}`;
const stateFile = 'artifacts/private/live-deploy.json';
const buildClient = new Client({ urlPrefix: 'https://cloudbuild.googleapis.com', apiVersion: 'v1' });
const run = new Client({ urlPrefix: 'https://run.googleapis.com', apiVersion: 'v2' });
const secrets = new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' });
const runtimeIdentity = `shield-runtime@${project}.iam.gserviceaccount.com`;
await connect();
const command = process.argv[2] ?? 'status';
if (command === 'build') {
  // Start clean so modules deleted from the source never linger in the image.
  const stage = 'artifacts/live-bridge'; await rm(stage, { recursive: true, force: true });
  await mkdir(`${stage}/lib/live`, { recursive: true }); await mkdir(`${stage}/lib/cloud`, { recursive: true });
  for (const file of ['auth', 'crypto', 'firebase-auth']) await copyFile(`dist/${file}.js`, `${stage}/lib/${file}.js`);
  for (const dir of ['cloud','live']) for (const file of await readdir(`dist/${dir}`)) if (file.endsWith('.js')) await copyFile(`dist/${dir}/${file}`, `${stage}/lib/${dir}/${file}`);
  // Shared call playback and monitoring resolve prerecorded Grace URLs from the approved catalog.
  await mkdir(`${stage}/lib/cloud/announcement-audio`, { recursive: true });
  await copyFile('dist/cloud/announcement-audio/manifest.json', `${stage}/lib/cloud/announcement-audio/manifest.json`);
  await mkdir(`${stage}/lib/live/ack-audio`, {recursive:true});
  for(const file of ['one-moment.pcmu','manifest.json'])await copyFile(`dist/live/ack-audio/${file}`,`${stage}/lib/live/ack-audio/${file}`);
  const root = JSON.parse(await readFile('package.json', 'utf8'));
  const names = ['fastify','@fastify/helmet','firebase-admin','firebase-functions','libphonenumber-js','openai','zod','ws'];
  await writeFile(`${stage}/package.json`, JSON.stringify({name:'shield-live-bridge',private:true,type:'module',overrides:root.overrides,
    dependencies:Object.fromEntries(names.map(name=>[name,root.dependencies[name]]))}));
  await writeFile(`${stage}/Dockerfile`, 'FROM node:22-slim\nWORKDIR /app\nCOPY package.json ./\nRUN npm install --omit=dev --ignore-scripts\nCOPY lib ./lib\nUSER node\nCMD ["node", "lib/live/server.js"]\n');
  execFileSync(process.execPath, ['scripts/check-live-package.mjs', stage], { stdio: 'inherit' });
  const tag = `demo-${Date.now()}`, object = `shield-live/${tag}.tgz`, bucket = 'gcf-v2-sources-562628621854-us-central1';
  const archive = '/tmp/shield-live-deploy.tgz'; execFileSync('/usr/bin/tar',['-czf',archive,'-C',stage,'package.json','Dockerfile','lib']);
  const upload = new Client({urlPrefix:'https://storage.googleapis.com',apiVersion:'upload/storage/v1'});
  await upload.post(`/b/${bucket}/o`,createReadStream(archive),{queryParams:{uploadType:'media',name:object},headers:{'content-type':'application/gzip'}});
  const image = `${region}-docker.pkg.dev/${project}/gcf-artifacts/shield-live:${tag}`;
  const operation = (await buildClient.post(`${parent}/builds`, {source:{storageSource:{bucket,object}},
    steps:[{name:'gcr.io/cloud-builders/docker',args:['build','-t',image,'.']}],images:[image],timeout:'600s',
    serviceAccount:`projects/${project}/serviceAccounts/562628621854-compute@developer.gserviceaccount.com`,options:{logging:'CLOUD_LOGGING_ONLY'}})).body;
  const state = { image, operation:operation.name, build:operation.metadata?.build?.id };
  await writeFile(stateFile,JSON.stringify(state),{mode:0o600}); console.log(JSON.stringify({build:state.build,status:'submitted'}));
} else if (command === 'status') {
  const s = JSON.parse(await readFile(stateFile,'utf8'));
  if(s.build){const b=(await buildClient.get(`${parent}/builds/${s.build}`)).body;console.log(JSON.stringify({status:b.status, failure:b.failureInfo?.detail, digest:b.results?.images?.[0]?.digest}));}
  if(s.runOperation){const o=(await run.get(`/${s.runOperation}`)).body;console.log(JSON.stringify({deploymentDone:!!o.done,error:o.error?.message,uri:o.response?.uri}));}
} else if (command === 'deploy') {
  const s=JSON.parse(await readFile(stateFile,'utf8')); const b=(await buildClient.get(`${parent}/builds/${s.build}`)).body;
  if(b.status!=='SUCCESS') throw new Error('build_not_successful');
  const secretPath=`/projects/${project}/secrets/SHIELD_OPENAI_API_KEY`;
  await secrets.get(`${secretPath}/versions/2`);
  const policy=(await secrets.get(`${secretPath}:getIamPolicy`)).body; policy.bindings??=[];
  let binding=policy.bindings.find(x=>x.role==='roles/secretmanager.secretAccessor'&&!x.condition);
  if(!binding){binding={role:'roles/secretmanager.secretAccessor',members:[]};policy.bindings.push(binding);}
  if(!binding.members.includes(`serviceAccount:${runtimeIdentity}`))binding.members.push(`serviceAccount:${runtimeIdentity}`);
  await secrets.post(`${secretPath}:setIamPolicy`,{policy});
  const name=`${parent}/services/shield-live`;
  let existing;try{existing=(await run.get(name)).body;}catch(e){if(e.status!==404)throw e;}
  // Keep the explicitly enabled hybrid mode and its pinned STT secret on future rebuilds.
  const hybridEnv=(existing?.template?.containers?.[0]?.env??[]).filter(e=>['SHIELD_SCREENING_MODE','SONIOX_API_KEY'].includes(e.name));
  const body={name:name.slice(1),description:'Shield GPT Live screening with signed per-call streams; up to ten sessions per instance.',ingress:'INGRESS_TRAFFIC_ALL',
    // Prepare while ringing; durable workers finish carrier work after media ends.
    template:{serviceAccount:runtimeIdentity,timeout:'120s',maxInstanceRequestConcurrency:10,scaling:{minInstanceCount:0,maxInstanceCount:2},
      containers:[{image:s.image,ports:[{containerPort:8080}],resources:{limits:{cpu:'1',memory:'512Mi'},cpuIdle:true,startupCpuBoost:true},
        env:[{name:'SHIELD_RUNTIME',valueSource:{secretKeyRef:{secret:'SHIELD_RUNTIME',version:'latest'}}},
          {name:'OPENAI_API_KEY',valueSource:{secretKeyRef:{secret:'SHIELD_OPENAI_API_KEY',version:'2'}}},...hybridEnv]}]}};
  const o=existing?(await run.patch(name,body,{queryParams:{updateMask:'template,description'}})).body
    :(await run.post(`${parent}/services`,{...body,name:undefined},{queryParams:{serviceId:'shield-live'}})).body;
  s.runOperation=o.name;await writeFile(stateFile,JSON.stringify(s),{mode:0o600});console.log('Live bridge deployment submitted.');
} else if(command==='publish') {
  const name=`${parent}/services/shield-live`;const service=(await run.get(name)).body;
  if(service.terminalCondition?.state!=='CONDITION_SUCCEEDED')throw new Error('bridge_not_ready');
  const policy=(await run.get(`${name}:getIamPolicy`)).body;policy.bindings??=[];
  if(!policy.bindings.some(x=>x.role==='roles/run.invoker'&&x.members?.includes('allUsers')))policy.bindings.push({role:'roles/run.invoker',members:['allUsers']});
  await run.post(`${name}:setIamPolicy`,{policy});
  const ready=await fetch(`${service.uri}/ready`);if(!ready.ok)throw new Error('bridge_health_failed');
  console.log(JSON.stringify({uri:service.uri,health:await ready.json()}));
} else throw new Error('unknown_command');
