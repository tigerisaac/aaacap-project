/** Only the owned public Shield DID may be temporarily bound to the lab. */
export async function publicNumberSnapshot(config,api) {
  const response=await api(`/phone_numbers?filter[phone_number]=${encodeURIComponent(config.TELNYX_NUMBER)}`);
  const matches=response.data.filter(n=>n.phone_number===config.TELNYX_NUMBER);
  if(matches.length!==1||matches[0].connection_id!==config.TELNYX_SHARED_APPLICATION_ID||matches[0].status!=='active')throw Error('public_number_binding_changed');
  const active=await api(`/connections/${config.TELNYX_SHARED_APPLICATION_ID}/active_calls?page[size]=1`);
  if(!Array.isArray(active.data)||active.data.length||Number(active.meta?.total_results??0)>0)throw Error('production_calls_active');
  return {id:matches[0].id,phoneNumber:config.TELNYX_NUMBER,originalConnection:config.TELNYX_SHARED_APPLICATION_ID};
}
export async function restorePublicNumber(config,api,binding,labConnection) {
  if(!binding)return true;
  if(binding.phoneNumber!==config.TELNYX_NUMBER||binding.originalConnection!==config.TELNYX_SHARED_APPLICATION_ID||labConnection===binding.originalConnection)throw Error('invalid_restore_binding');
  const path=`/phone_numbers/${encodeURIComponent(binding.id)}`,current=(await api(path)).data;
  if(current.phone_number!==binding.phoneNumber)throw Error('restore_number_mismatch');
  if(current.connection_id===binding.originalConnection)return true;
  if(current.connection_id!==labConnection)throw Error('restore_connection_conflict');
  await api(path,'PATCH',{connection_id:binding.originalConnection});
  return (await api(path)).data.connection_id===binding.originalConnection;
}
