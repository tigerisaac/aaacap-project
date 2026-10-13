// Authored after v146 was frozen. Assess only; do not tune from these outcomes.
// Recent public warnings inform categories, never copied caller transcripts.
export const synthetic=true;
const c=(name,category,text,action,caution=false)=>({name,category,focus:'joint-correction-validation',turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('jointcheck-role-bill','legit','Her regular gardener here. The invoice for the work we agreed last month is in the customer portal, as usual.','approve'),
 c('jointcheck-role-callback','legit','The mobility scooter repairer. Could she ring me to choose a time for me to return the scooter she left with us?','approve'),
 c('jointcheck-friend-warning','legit','I play cards with her on Fridays. Someone tried to make me buy vouchers to avoid a court fine. I hung up, and I want to warn her about it.','approve'),
 c('jointcheck-family-private','legit','Her aunt speaking. I would rather discuss the family news with her privately. Please ask her to call when she is free.','approve'),
 c('jointcheck-own-transaction','legit','I am her nephew. A mystery debit appeared in my account and I have already spoken to my bank. I just want to tell her what happened to me.','approve'),
 c('jointcheck-care-update','legit','Her home care team. Tomorrow’s visit will be half an hour later; we are calling to tell her about the change.','approve'),
 c('jointcheck-refund-result','legit','The shoe repair counter. We returned the overpayment for her repair to the card she used. I am confirming the correction is finished.','approve'),
 c('jointcheck-borrowed-item','legit','The lending library for household equipment. She reserved a steam cleaner; could she phone us to arrange pickup?','approve'),
 c('jointcheck-recorded-receipt','legit','Recorded confirmation from the car park: the payment for the monthly space she booked has been received.','message'),
 c('jointcheck-recorded-credit','legit','This is the automated ticket line. The cancellation refund she requested is complete. There is nothing else to do.','message'),
 c('jointcheck-recorded-closure','legit','Automatic message from her swimming pool. The pool is closed for repairs on Wednesday. Press one to hear this notice again.','message'),
 c('jointcheck-add-number','scam','Marley speaking. Tell her to add this number on WhatsApp and say hello there.','block'),
 c('jointcheck-no-purpose-callback','scam','Our contact desk needs her to call back. We will give the subject after she reaches us.','block'),
 c('jointcheck-empty-channel','scam','Please have her enter our private chat. The invitation is the whole message for now.','block'),
 c('jointcheck-charge-no-next-step','scam','Automatic card notification. There is a new purchase on her account that she may not recognise. This concludes the announcement.','block'),
 c('jointcheck-consent-access','scam','The reunion organiser. To see our seating plan she needs to authorise our viewer to read her emails and send messages in her name. We do not need her password.','block'),
 c('jointcheck-courier-protection','scam','The government protection desk. She must withdraw her savings and hand the cash to our messenger so it can be kept secure during the investigation.','block'),
 c('jointcheck-official-secrecy','scam','The compliance investigator. I can explain the matter to her, but she must keep this call secret from her children and bank staff.','block'),
 c('jointcheck-caution-callback','legit','Her cousin again. Our call broke off a minute ago and I want to finish our conversation.','hold',true),
 c('jointcheck-caution-work','legit','The electrician she booked. I have finished the inspection and want to arrange collection of the written report.','approve',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'joint-correction-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('jointcheck-missing-role','legit',['I need to arrange when her parcel can be dropped off.','I am the courier assigned to her furniture order.'],'approve'),
 s('jointcheck-claim-to-task','legit',['The tribunal office. There is an update concerning her case.','She asked for a copy of the decision; it is ready for her to collect from our public counter.'],'approve'),
 s('jointcheck-claim-to-payment','scam',['The credits department about money due back to her.','She must first send a release fee using a cryptocurrency kiosk.'],'block'),
 s('jointcheck-incoming-refusal','unclear',['Ellis here. Can I speak with her?','I will not say what this is about.'],'hold'),
];
