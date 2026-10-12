import { Client, connect, firestore, documentRoot, project } from './firebase-client.mjs';
import { TIMING_METRICS, TIMING_PHASES } from '../dist/live/timing.js';

// Operator-only outcome inspection. Never print caller numbers, audio, transcripts or URLs with tokens.
try {
  await connect();
  const decode=v=>'mapValue' in v?Object.fromEntries(Object.entries(v.mapValue.fields??{}).map(([k,x])=>[k,decode(x)])):'arrayValue' in v?(v.arrayValue.values??[]).map(decode):'integerValue' in v?Number(v.integerValue):v.stringValue??v.booleanValue??null;
  const wanted=['id','state','outcome','reason','screeningModel','screeningCaution','createdAt','liveConnectedAt','liveFinishedAt','acceptedAt','completedAt',
    'monitorPolicyVersion','monitorConcern','monitorEvidenceAt','monitorIntervenedAt','monitorRedirectedAt','events'];
  const result=(await firestore().post(`${documentRoot}:runQuery`,{structuredQuery:{from:[{collectionId:'callSessions'}],
    select:{fields:wanted.map(fieldPath=>({fieldPath}))},orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'}],limit:5}})).body;
  const calls=result.filter(r=>r.document).map(r=>Object.fromEntries(Object.entries(r.document.fields).map(([k,v])=>[k,decode(v)])));
  console.log(JSON.stringify({calls},null,2));
  if (!process.argv.includes('--outcomes-only')) {
  const logging=new Client({urlPrefix:'https://logging.googleapis.com',apiVersion:'v2'});
  const since=new Date(Date.now()-15*60*1000).toISOString();
  const callIds=calls.map(c=>c.id).filter(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id));
  const created=calls.map(c=>c.createdAt).filter(n=>typeof n==='number'&&Number.isFinite(n));
  const bridgeSince=new Date(Math.max(Date.now()-24*60*60*1000,created.length?Math.min(...created):Date.now()-15*60*1000)).toISOString();
  const resourceFilter='resource.type="cloud_run_revision" AND resource.labels.service_name="shield-live"';
  const filter=`${resourceFilter} AND timestamp>="${bridgeSince}" AND jsonPayload.event="live_timing"`;
  const logs=(await logging.post('/entries:list',{resourceNames:[`projects/${project}`],filter:`${resourceFilter} AND timestamp>="${since}" AND jsonPayload.event="live_screening_finished"`,orderBy:'timestamp desc',pageSize:10})).body.entries??[];
  let pageToken, scanned=0;
  do {
    const page=(await logging.post('/entries:list',{resourceNames:[`projects/${project}`],filter,orderBy:'timestamp desc',pageSize:1000,...(pageToken?{pageToken}:{})})).body;
    const entries=page.entries??[]; scanned+=entries.length;
    logs.push(...entries.filter(e=>callIds.includes(e.jsonPayload?.callId))); pageToken=page.nextPageToken;
  } while(pageToken && scanned<2000);
  logs.sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
  const timingFields=['elapsedMs',...TIMING_METRICS];
  console.log(JSON.stringify({bridge:logs.map(e=>{
    const p=e.jsonPayload??{};
    if(p.event!=='live_timing')return {at:e.timestamp,event:p.event,callId:p.callId,decision:p.decision,elapsedMs:p.elapsedMs};
    return {at:e.timestamp,event:'live_timing',callId:callIds.includes(p.callId)?p.callId:undefined,
      phase:TIMING_PHASES.includes(p.phase)?p.phase:undefined,
      ...Object.fromEntries(timingFields.filter(k=>typeof p[k]==='boolean'||(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0)).map(k=>[k,p[k]]))};
  }),timingSince:bridgeSince,truncated:!!pageToken},null,2));
  // Connected-call protection timing: queue delay (cold starts), model time and tier, request-to-warning delay. No content is logged.
  const monitor=(await logging.post('/entries:list',{resourceNames:[`projects/${project}`],filter:`resource.type="cloud_run_revision" AND resource.labels.service_name=("monitorconnectedcall" OR "shieldapi") AND timestamp>="${since}" AND jsonPayload.event:"monitor_"`,orderBy:'timestamp desc',pageSize:20})).body.entries??[];
  const keep=['event','queuedMs','checkMs','elapsedMs','serviceTier','redirected','evidenceToDecisionMs','decisionToRedirectMs','evidenceToRedirectMs'];
  console.log(JSON.stringify({monitor:monitor.map(e=>({at:e.timestamp,...Object.fromEntries(keep.filter(k=>e.jsonPayload?.[k]!==undefined).map(k=>[k,e.jsonPayload[k]]))}))},null,2));
  }
} catch(error) {console.error('Call inspection failed:',error.status??error.code??error.name);process.exitCode=1;}
