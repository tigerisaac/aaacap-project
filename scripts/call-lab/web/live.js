const $=id=>document.getElementById(id);
const alias=/^#person-0[1-5]$/.test(globalThis.location?.hash??'')?globalThis.location.hash.slice(1):'person-01';
const index=Number(alias.slice(-2))-1,callerTone=440+index*440,recipientTone=660+index*440;
let capacityMode=false,capacityReady=false;
let caller,recipient,callerCall,recipientCall,context,kind,ready=false,running=false,deadlineTimer,initialized=false,failed=false,stopping=false;
const audioStats={caller:{bytes:0,energy:0},recipient:{bytes:0,energy:0}};
const events=[];
function note(message){$('status').textContent=message;}
function event(message){events.push(message);const li=document.createElement('li');li.textContent=message;$('results').append(li);}
async function post(path,data={}){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...data,alias})});const out=await r.json();if(!r.ok)throw Error(out.error??'gateway_unavailable');return out;}
function fixture(hz){const dest=context.createMediaStreamDestination(),osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=hz;gain.gain.value=.035;osc.connect(gain).connect(dest);osc.start();return dest.stream;}
async function stats(call,role){const peer=call?.peer?.instance;if(!peer)return;const report=await peer.getStats();report.forEach(r=>{if(r.type==='inbound-rtp'&&r.kind==='audio'){audioStats[role].bytes=Math.max(audioStats[role].bytes,r.bytesReceived??0);audioStats[role].energy=Math.max(audioStats[role].energy,r.totalAudioEnergy??0);}});}
function receivedTone(call){
  if(!context||!call?.remoteStream)return null;
  if(!call.labAnalyser){const source=context.createMediaStreamSource(call.remoteStream),analyser=context.createAnalyser();analyser.fftSize=4096;source.connect(analyser);call.labAnalyser=analyser;}
  const bins=new Float32Array(call.labAnalyser.frequencyBinCount);call.labAnalyser.getFloatFrequencyData(bins);
  let best=1;for(let i=2;i<bins.length;i++)if(bins[i]>bins[best])best=i;
  return {hz:best*context.sampleRate/call.labAnalyser.fftSize,db:Number.isFinite(bins[best])?bins[best]:-160};
}
async function connect(role,token){return new Promise((resolve,reject)=>{
  const client=new TelnyxWebRTC.TelnyxRTC({login_token:token});
  const timer=setTimeout(()=>reject(Error('browser_registration_timeout')),20000);
  client.on('telnyx.ready',()=>{clearTimeout(timer);event(`${role} endpoint ready`);resolve(client);});
  client.on('telnyx.error',()=>{clearTimeout(timer);reject(Error('browser_connection_failed'));});
  client.on('telnyx.notification',n=>{
    if(n.type!=='callUpdate')return;const call=n.call;
    if(role==='recipient')recipientCall=call;else callerCall=call;
    event(`${role}: ${call.state}`);
    if(role==='recipient'&&call.state==='ringing'){call.options.localStream=fixture(recipientTone);call.answer({remoteElement:$('recipient-audio')});}
    if(role==='recipient'&&call.state==='active'&&!call.labDigitTimer){call.labDigitTimer=setTimeout(()=>{if(call.state==='active'){call.dtmf(kind==='accept'?'1':'2');event(`recipient sent ${kind==='accept'?'1':'2'}`);}},6000);}
  });client.connect();
});}
$('prepare').onclick=async()=>{
  $('prepare').disabled=true;note('Connecting the two browser endpoints…');
  try{context=new AudioContext();await context.resume();const tokens=await post('/credentials');[caller,recipient]=await Promise.all([connect('caller',tokens.caller),connect('recipient',tokens.recipient)]);ready=true;$('run').disabled=capacityMode&&alias==='person-05'&&!capacityReady;note('Both endpoints are ready. Starting a test uses one paid attempt.');}
  catch{failed=true;note('Browser registration failed. No call was placed. Stop testing before trying a new run.');}
};
$('run').onclick=async()=>{
  if(!ready||running||(capacityMode&&alias==='person-05'&&!capacityReady))return;running=true;$('run').disabled=true;$('scenario').disabled=true;kind=$('scenario').value;
  failed=false;callerCall=undefined;recipientCall=undefined;
  for(const role of ['caller','recipient'])audioStats[role]={bytes:0,energy:0};
  event(`New attempt: ${kind==='accept'?'press 1 to connect':'press 2 for voicemail'}`);
  try{await context.resume();const request=await post('/reserve',{kind});deadlineTimer=setTimeout(()=>{callerCall?.hangup();recipientCall?.hangup();void post('/finish');},Math.max(0,request.deadline-Date.now()));
    callerCall=caller.newCall({...request,audio:true,video:false,localStream:fixture(callerTone),remoteElement:$('caller-audio')});note('Test call running. The gateway will end it automatically.');
  }catch{running=false;failed=true;note('The attempt could not start. It may have consumed an attempt. Stop testing and review the gateway before a new run.');}
};
$('stop').onclick=async()=>{
  stopping=true;note('Stopping calls and disabling test connections…');clearTimeout(deadlineTimer);$('run').disabled=true;$('prepare').disabled=true;ready=false;
  // Send the server stop even if a browser endpoint or AudioContext has failed.
  const stopRequest=post('/stop');
  void Promise.allSettled([()=>callerCall?.hangup(),()=>recipientCall?.hangup(),()=>caller?.disconnect(),()=>recipient?.disconnect(),()=>context?.close()].map(fn=>Promise.resolve().then(fn)));
  try{const state=await stopRequest;note(state.resourcesDisabled?'Testing stopped; isolated Telnyx connections disabled.':'Calls stopped; connection cleanup needs verification. Check the gateway before leaving.');}
  catch{failed=true;note('Stop could not be confirmed. The watchdog will retry; check gateway cleanup before leaving.');}
};
setInterval(async()=>{
  try{await Promise.all([stats(callerCall,'caller'),stats(recipientCall,'recipient')]);const state=await(await fetch('/status')).json();window.labEvidence={audioStats,events,state};$('attempts').textContent=`${state.used} of ${state.limit}`;
    $('media').textContent=`Received audio: caller ${audioStats.caller.bytes} bytes; recipient ${audioStats.recipient.bytes} bytes.`;
    const a=state.attempts.filter(a=>!a.alias||a.alias===alias).at(-1);if(running&&a?.ended){running=false;clearTimeout(deadlineTimer);$('scenario').disabled=false;$('run').disabled=!state.ready||state.used>=state.limit;note(`Call ended. ${state.used} of ${state.limit} attempts used. ${a.outcome??'No completed outcome'}.`);}
    if(state.mode==='capacity'){
      capacityMode=true;capacityReady=state.capacityReady;
      $('scenario').value='accept';$('scenario').disabled=true;
      document.querySelector('[data-concurrency]').textContent='Four connected + one voicemail';
      document.querySelector('[data-deadline]').textContent='90 seconds';
      document.querySelector('[data-estimate]').textContent='6–10¢; allow 15¢';
      document.querySelector('[data-intro]').textContent=`${alias}: five test callers share the public number. The isolated receiver allows four recipient connections; the fifth caller must reach voicemail. This does not measure the account’s 10-call ceiling.`;
      if(ready&&!running&&!a&&!stopping&&!failed)$('run').disabled=alias==='person-05'&&!capacityReady;
      if(ready&&!running&&!a&&alias==='person-05'&&!capacityReady)note('Waiting for the first four conversations to connect. Then start this overflow caller.');
      if(ready&&!running&&!a&&alias==='person-05'&&capacityReady&&!stopping&&!failed)note('Four conversations are connected. Start this caller to test voicemail overflow.');
      if(running&&state.capacityOverlapStartedAt)await post('/evidence',{caller:receivedTone(callerCall),recipient:receivedTone(recipientCall)});
    }
    if(state.mode==='overlap'){
      $('scenario').value='accept';$('scenario').disabled=true;
      const concurrency=document.querySelector('[data-concurrency]');if(concurrency)concurrency.textContent='Two calls together';
      const summary=document.querySelector('[data-intro]');if(summary)summary.textContent=`${alias==='person-01'?'First':'Second'} recipient: call Shield’s public number. Both conversations stay connected together for 10 seconds. Synthetic audio and fixed screening isolate routing and call capacity.`;
      if(running&&state.overlapStartedAt)note(`Both calls connected. Checking 10 seconds of overlap for ${alias}.`);
      if(running&&state.overlapStartedAt&&Date.now()-state.overlapStartedAt>750){
        await post('/evidence',{caller:receivedTone(callerCall),recipient:receivedTone(recipientCall),audio:audioStats});
      }
    }
    if(!initialized){initialized=true;if(!stopping&&!failed)note(state.ready?'Gateway ready. Connect the browser endpoints to begin.':'Testing is closed. A new run needs operator approval.');}
    if(!state.ready){$('run').disabled=true;$('prepare').disabled=true;if(!stopping&&!failed)note(state.resourcesDisabled?'Testing stopped; isolated Telnyx connections disabled.':'Testing is unavailable. Check gateway cleanup before a new run.');}
    else if(state.used>=state.limit){$('run').disabled=true;$('prepare').disabled=true;if(!running&&!stopping&&!failed)note('All approved attempts are used. Stop and disable testing; a new run needs approval.');}
  }catch{note('Gateway unavailable. The independent watchdog will stop testing.');$('run').disabled=true;}
},1000);
