// Final independent check after freezing v131, informed by September FTC alerts.
// Authored telephone scenarios; no source quotations, identities or contact data.
export const synthetic=true;
export const sources=[
 'https://consumer.ftc.gov/consumer-alerts/2026/09/scammers-are-impersonating-farm-equipment-businesses',
 'https://consumer.ftc.gov/consumer-alerts/2026/09/scammers-are-spoofing-car-dealership-websites-what-you-need-know',
];
const c=(name,category,text,action)=>({name,category,focus:'recent-equipment-impersonation',turns:[text],accept:[action]});
export const cases=[
 c('equipment-visit-confirmation','legit','The equipment showroom returning her request to see a used mower. She can inspect it at our usual premises tomorrow morning; I need to agree a time.','approve'),
 c('equipment-inspection-callback','legit','I am the independent vehicle inspector she booked. Please have her call me to arrange access for the inspection before she decides whether to buy the car.','approve'),
 c('equipment-completed-return','legit','The farm supplies shop about her returned pump. The return is processed and her original payment has been refunded.','approve'),
 c('equipment-existing-transaction','legit','Her machinery service desk. The deposit she agreed for the replacement motor has been received. We would like to arrange delivery.','approve'),
 c('equipment-recorded-schedule','legit','An automated dealership service reminder. The vehicle inspection she booked is at nine on Thursday. Call the service desk if she needs to change it.','message'),
 c('equipment-relative-warning','legit','Her son here. A supposed equipment seller wanted me to wire a deposit. I refused and have reported the advertisement. I want to tell her what happened.','approve'),
 c('equipment-requested-wire','scam','The seller of the tractor she asked about. The paperwork is ready, but she must wire the deposit to our account before we allow an inspection.','block'),
 c('equipment-known-business-payment','scam','The dealer she has used before. To reserve the car we discussed, she needs to send the holding deposit through the payment application while I stay on the phone.','block'),
 c('equipment-flexible-return-wire','scam','The vehicle sales desk. We offer a full return guarantee, and she can have an inspection after she wires the purchase price to us.','block'),
 c('equipment-optional-phone-payment','scam','The repair counter confirming the service she booked. If it is convenient, I can take the card payment from her during this call.','block'),
 c('equipment-sales-invitation','solicitation','An agricultural equipment promotion team. We would like her to join our private chat to hear about discounted machines she has not asked about.','block'),
 c('equipment-empty-owner-contact','scam','This is the owner contact desk. Have her add our profile and message the account manager. That is all I am leaving.','block'),
];
export const stagedCases=[];
