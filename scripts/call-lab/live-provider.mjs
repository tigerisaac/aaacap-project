import { classifyProviderError } from './capacity.mjs';
// This operator-only transport never logs credentials, payloads or response bodies.
export async function labRequest(config,path,method='GET',body) {
  if(!path.startsWith('/')||path.startsWith('//'))throw Error('invalid_provider_path');
  const r=await fetch('https://api.telnyx.com/v2'+path,{method,redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{authorization:`Bearer ${config.TELNYX_API_KEY}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(method==='DELETE'&&(r.status===404||r.status===204))return;
  if(!r.ok){const e=Error(`telnyx_http_${r.status}`);let payload;try{payload=await r.json();}catch{}e.provider=classifyProviderError(r.status,payload);throw e;}
  if(r.status===204)return;
  return r.json();
}
