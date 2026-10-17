import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
// These reserved fictional identities exist only in demo-shield-call-lab.
export const routes = Array.from({length:25},(_,n)=>({ alias:`person-${String(n+1).padStart(2,'0')}`, phone:`+120255501${String(n).padStart(2,'0')}` }));
export const shieldNumber='+12025550198',callerNumber='+12025550199';
export class Tickets {
  constructor(now=Date.now) { this.now=now;this.secret=randomBytes(32);this.run=randomUUID();this.bindings=new Map(); }
  issue(alias) {
    if(!routes.some(r=>r.alias===alias)) throw Error('unknown_test_recipient');
    const value=Buffer.from(JSON.stringify({run:this.run,alias,nonce:randomUUID(),expires:this.now()+120_000})).toString('base64url');
    return value+'.'+createHmac('sha256',this.secret).update(value).digest('base64url');
  }
  read(ticket,callId) {
    if(typeof ticket!=='string'||ticket.length>1024||typeof callId!=='string'||!callId||callId.length>512) throw Error('invalid_test_ticket');
    const [value,mac,...rest]=ticket.split('.');const expected=createHmac('sha256',this.secret).update(value??'').digest();
    const supplied=Buffer.from(mac??'','base64url');
    if(rest.length||supplied.length!==expected.length||!timingSafeEqual(expected,supplied)) throw Error('invalid_test_ticket');
    const data=JSON.parse(Buffer.from(value,'base64url'));
    const route=routes.find(r=>r.alias===data.alias);
    if(data.run!==this.run||!route||data.expires<=this.now()) throw Error('expired_test_ticket');
    const bound=this.bindings.get(data.nonce);
    if(bound&&bound!==callId) throw Error('test_ticket_replayed');
    this.bindings.set(data.nonce,callId);return route;
  }
}
/** Only call AFTER verifying the provider signature. Never install this adapter in production. */
export function adaptInitiation(event,tickets,expectedConnection,signatureVerified) {
  if(signatureVerified!==true || event.event_type!=='call.initiated'||event.payload?.direction!=='incoming'
    ||event.payload.connection_id!==expectedConnection) throw Error('untrusted_lab_event');
  const headers=event.payload.custom_headers;
  if(!Array.isArray(headers)||headers.length>32)throw Error('missing_test_ticket');
  const matches=headers.filter(h=>h.name?.toLowerCase()==='x-shield-lab-ticket');
  if(matches.length!==1)throw Error('missing_test_ticket');
  const route=tickets.read(matches[0].value,event.payload.call_control_id);
  return {...event,payload:{...event.payload,to:shieldNumber,from:callerNumber,sip_headers:[{name:'Diversion',value:`<tel:${route.phone}>`}]} };
}
export function browserRequest(alias,tickets) {
  return { destinationNumber:'sip:shield@shield-call-lab.invalid',audio:true,video:false,
    customHeaders:[{name:'X-Shield-Lab-Ticket',value:tickets.issue(alias)}] };
}
