import { writeFile } from 'node:fs/promises';
export async function archiveSyntheticRecording(api,id,parentSid,connection,path,download=fetch) {
  const r=(await api(`/recordings/${encodeURIComponent(id)}`)).data;
  if(r.call_control_id!==parentSid||r.connection_id!==connection||r.status!=='completed'||!(r.duration_millis>0&&r.duration_millis<=90000))throw Error('recording_identity_mismatch');
  const url=new URL(r.download_urls?.mp3);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hostname!=='s3.amazonaws.com'||!url.pathname.startsWith('/telephony-recorder-prod/'))throw Error('recording_origin_rejected');
  const response=await download(url,{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok||!response.body)throw Error('recording_download_failed');
  const chunks=[];let size=0;
  for await(const part of response.body){size+=part.length;if(size>2_000_000)throw Error('recording_too_large');chunks.push(part);}
  if(size<100)throw Error('recording_empty');
  await writeFile(path,Buffer.concat(chunks),{mode:0o600});
  return {durationMs:r.duration_millis,bytes:size,identityVerified:true};
}
