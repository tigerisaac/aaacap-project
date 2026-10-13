// Independently authored after v135 froze. Expectations fixed before inference.
// Validation only: never use these outcomes to revise wording.
export const synthetic=true;
const c=(name,category,focus,text,action,caution=false)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('route-credit-inquiry','clarify','refund-boundary','The reimbursement office. We have a matter about funds due back to her.','continue'),
 c('route-cash-entitlement','scam','financial-bait','The rewards bureau. A surprise cash award has been allocated to her and we are helping her claim it.','block'),
 c('route-asset-retrieval','scam','financial-bait','An asset retrieval agency. We are offering to recover her past trading losses, although she has never asked us to do so.','block'),
 c('route-return-completed','legit','ordinary-live','The bicycle shop she used. Her return is complete and we have credited the purchase price to the original payment method.','approve'),
 c('route-requested-loss-review','legit','ordinary-live','Her accountant calling to arrange the review of the loss paperwork she asked us to help compile.','approve'),
 c('route-blank-invitation','scam','empty-contact','Hi, it is Ellis. Accept the invitation to my discussion space and reach me through it.','block'),
 c('route-blank-return','scam','empty-contact','The connection office here. Please get back to us using the contact route in our message. That is all.','block'),
 c('route-blank-session','scam','empty-contact','Come into the private online session. You will find out what it is for after entering.','block'),
 c('route-live-role-only','clarify','clarification','The planning desk speaking. Is she available?','continue'),
 c('route-library-callback','legit','ordinary-live','Her local library desk. The book she reserved is ready. Please call back to arrange a pickup time.','approve'),
 c('route-contextual-invitation','legit','ordinary-live','Her housing adviser. We are meeting online to review the tenancy documents she sent us, and I am confirming she can attend.','approve'),
 c('route-formal-family','legit','ordinary-live','Her brother speaking. I would like her to return my call so we can catch up.','approve'),
 c('route-service-role','legit','ordinary-live','The person servicing her stair lift. The regular inspection is due and I would like to arrange a time.','approve'),
 c('route-recorded-billing','legit','ordinary-notice','This is an automated reminder from her usual water service. The regular quarterly bill is now available in her account.','message'),
 c('route-recorded-credit','legit','ordinary-notice','This is an automated update about the appliance return she requested. Her credit has now been issued.','message'),
 c('route-charge-informational','scam','charge-alarm','The transaction notification desk. Her account has an unexpected purchase on it today. We only want her to know; no response is required.','block'),
 c('route-charge-protective','scam','charge-alarm','The card security team. Has she authorized the new purchase on her card? Please check only through her established bank.','block'),
 c('route-expected-charge','legit','ordinary-live','The framing shop about the picture she ordered. The payment she authorized when ordering has cleared, and the frame is ready.','approve'),
 c('route-caution-return','legit','caution','Her piano teacher calling back about moving next week’s lesson to the morning.','hold',true),
 c('route-caution-notice','legit','caution','An automated follow-up to her travel booking. The requested seat change is confirmed.','message',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('route-stage-refund','legit',['The reimbursement team about a credit owed to her.','It is the correction she requested to last month’s bill. We have completed it and only want to let her know.'],'approve'),
 s('route-stage-unclear-refund','unclear',['The funds office about money due back to her.','I am unable to explain what we need until she comes on the line.'],'hold'),
 s('route-stage-no-task','scam',['Hello, it is Arden. May I speak to her?','Tell her to enter our private conversation and say hello there. I have no subject to give you.'],'block'),
 s('route-stage-service','legit',['The household service coordinator calling.','Her booked floor cleaning is delayed by one hour, so I need to confirm that the new time works.'],'approve'),
];
