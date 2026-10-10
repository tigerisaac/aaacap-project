import { Client, connect, firestore, documentRoot, project } from './firebase-client.mjs';

// Operator-only outcome inspection. Never print caller numbers, audio, transcripts or URLs with tokens.
try {
  await connect();
  const decode=v=>'mapValue' in v?Object.fromEntries(Object.entries(v.mapValue.fields??{}).map(([k,x])=>[k,decode(x)])):'arrayValue' in v?(v.arrayValue.values??[]).map(decode):'integerValue' in v?Number(v.integerValue):v.stringValue??v.booleanValue??null;
  const wanted=['id','state','outcome','reason','screeningModel','createdAt','liveConnectedAt','liveFinishedAt','acceptedAt','completedAt','events'];
  const result=(await firestore().post(`${documentRoot}:runQuery`,{structuredQuery:{from:[{collectionId:'callSessions'}],
    select:{fields:wanted.map(fieldPath=>({fieldPath}))},orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'}],limit:5}})).body;
  console.log(JSON.stringify({calls:result.filter(r=>r.document).map(r=>Object.fromEntries(Object.entries(r.document.fields).map(([k,v])=>[k,decode(v)])))},null,2));
  if (!process.argv.includes('--outcomes-only')) {
  const logging=new Client({urlPrefix:'https://logging.googleapis.com',apiVersion:'v2'});
  const since=new Date(Date.now()-15*60*1000).toISOString();
  const logs=(await logging.post('/entries:list',{resourceNames:[`projects/${project}`],filter:`resource.type="cloud_run_revision" AND resource.labels.service_name="shield-live" AND timestamp>="${since}" AND jsonPayload.event:*`,orderBy:'timestamp desc',pageSize:10})).body.entries??[];
  console.log(JSON.stringify({bridge:logs.map(e=>({at:e.timestamp,event:e.jsonPayload?.event,decision:e.jsonPayload?.decision,elapsedMs:e.jsonPayload?.elapsedMs}))},null,2));
  }
} catch(error) {console.error('Call inspection failed:',error.status??error.code??error.name);process.exitCode=1;}
