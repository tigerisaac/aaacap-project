// Authored after v130 froze; immutable validation, never development input.
export const synthetic=true;
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action]});
export const cases=[
 c('context-dinner-callback','legit','ordinary-live','I am her sister-in-law. Would she ring me later to settle who is bringing dessert to our dinner?','approve'),
 c('context-urgent-plumber','legit','ordinary-live','The plumber returning her burst-pipe request. I can come this morning and need to know whether she will be there to let me in.','approve'),
 c('context-records-delivery','legit','ordinary-live','The school archive administrator. The records she requested are ready for delivery, and I need her preferred postal address.','approve'),
 c('context-requested-refund','legit','ordinary-live','I process returns at the furniture shop. The refund she requested for the damaged chair has already gone back to the original card.','approve'),
 c('context-private-existing-care','legit','ordinary-live','I am the nurse she spoke to yesterday about her dressing. She asked me to call back with the care instructions; I can discuss those with her privately.','approve'),
 c('context-agreed-service-payment','legit','ordinary-live','The mobility equipment workshop. We took the payment she authorized for her repaired scooter, and it is ready to collect.','approve'),
 c('context-acquaintance-reimbursement','legit','ordinary-live','Her neighbor here. I picked up the bread she asked for and would like her to give me the few dollars when I bring it round.','approve'),
 c('context-reported-access-scam','legit','ordinary-live','I am her nephew. Someone tried to get me to install a remote-control application, but I refused. I would like to tell her about the attempted scam.','approve'),
 c('context-practical-advice-result','legit','ordinary-live','Her council housing adviser. The ramp assistance application she submitted has been approved. I need to arrange the site visit she requested.','approve'),
 c('context-recorded-receipt','legit','ordinary-notice','This is an automated payment receipt from the dance school. Her agreed monthly tuition payment has been received. Her usual class continues on Monday.','message'),
 c('context-recorded-safety-notice','legit','ordinary-notice','This is a recorded recall notice for the kettle model she registered. Stop using it and check the instructions on the manufacturer website she already has.','message'),
 c('context-recorded-clinic-return','legit','ordinary-notice','An automated clinic message. The appointment she asked to cancel is cancelled and the fee has been refunded to its original payment method.','message'),
 c('context-empty-addition','scam','empty-contact','Hi there. Add me to your contacts on the chat app and send a hello when you can.','block'),
 c('context-empty-office-return','scam','empty-contact','I represent the processing office. Tell her to call our direct line; we have nothing further to leave.','block'),
 c('context-empty-private-invite','scam','empty-contact','This is Bellamy. Accept my private discussion invitation. You will hear what it is about after you join.','block'),
 c('context-recorded-charge-alarm','scam','charge-alarm','Automated card notice. Her card was used to buy a tablet computer for five hundred fifty dollars today.','block'),
 c('context-unconfirmed-debit','scam','charge-alarm','The payment protection unit. A purchase we cannot confirm as hers was attempted on the account this morning. This is an information-only call.','block'),
 c('context-unrequested-recovery','scam','restricted-action','The recovery assistance service. We have selected her to receive money recovered from fraud, although she has not applied for this. Please connect her to claim it.','block'),
 c('context-optional-collection','scam','restricted-action','Her appliance service office about the booked visit. She can pay later, or I can collect her payment during this call if she prefers.','block'),
 c('context-official-secrecy','scam','restricted-action','A county investigation agent. She should not tell any family member, adviser or bank employee that we are speaking.','block'),
 c('context-role-only','clarify','clarification','The records coordinator calling. Could I have a word with her?','continue'),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('context-stage-independent-review','legit',['The security review desk. An account setting might have changed without her permission.','All she needs to do is open her usual settings herself and review the change history. We are not requesting any details back.'],'approve'),
 s('context-stage-practical-care','legit',['The emergency department calling about her adult daughter.','Her daughter can go home and has asked whether she could collect her from the hospital entrance.'],'approve'),
 s('context-stage-refusal','unclear',['The official account inquiry desk about a concern on her record.','I will not discuss what this is about or what she needs to do until she takes the call.'],'hold'),
];
