// Independently authored after v136/v137 froze and before outcome inspection.
// Validation only; do not use these cases to revise the prompt.
export const synthetic=true;
const c=(name,category,focus,text,action,caution=false)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('eventcheck-known-reservation','legit','expected-payment','The campsite office about the pitch she reserved. The payment she attempted for that reservation did not go through. She may pay at reception when she arrives.','approve'),
 c('eventcheck-approved-settlement','legit','expected-payment','The decorator working on her flat. Her agreed payment is still processing. I am letting her know that I will wait for it to clear.','approve'),
 c('eventcheck-recorded-renewal','legit','ordinary-notice','This is an automated update about her existing club membership. The regular payment was unsuccessful; the account she normally uses shows the renewal options.','message'),
 c('eventcheck-recorded-return','legit','ordinary-notice','Recorded update from the furniture shop. The refund for her returned chair has been issued to the card used for the purchase.','message'),
 c('eventcheck-own-card','legit','personal-report','Her friend speaking. My bank has been helping me with a charge on my own card, and I would like to talk about how upsetting it was.','approve'),
 c('eventcheck-cautionary-command','legit','reported-conduct','Her sister here. I want to warn her against entering computer commands a stranger sends. I would like to explain why that is dangerous.','approve'),
 c('eventcheck-rejected-installation','legit','reported-conduct','Her cousin. Someone told me to install a troubleshooting tool. I refused and hung up. I am calling to tell her what happened.','approve'),
 c('eventcheck-clinic-details','legit','ordinary-live','The nurse from her usual clinic confirming her visit. Could she confirm her date of birth and mailing address for the appointment record?','approve'),
 c('eventcheck-documents-at-visit','legit','ordinary-live','The housing office about her booked appointment. Please remind her to bring the documents we requested when she attends.','approve'),
 c('eventcheck-relative-private','legit','ordinary-live','Her son. I have had a difficult day and need a private conversation with her.','approve'),
 c('eventcheck-contextual-return','legit','ordinary-live','The tailor about the jacket she left for alterations. Please call me back so we can arrange a fitting.','approve'),
 c('eventcheck-recorded-service','legit','ordinary-notice','This is an automated message from her broadband service. The reported outage is taking longer to repair, and another update will follow.','message'),
 c('eventcheck-regular-invoice','legit','ordinary-live','Her usual home cleaning company. The invoice for last week’s booked visit is available in the account she already uses.','approve'),
 c('eventcheck-requested-computer-work','legit','ordinary-live','The repair shop she booked. Work on the computer she brought in is finished; I would like to arrange collection.','approve'),
 c('eventcheck-unspecified-charge','scam','charge-alarm','The account office. We have an unexplained charge to tell her about.','block'),
 c('eventcheck-authorization-without-context','scam','charge-alarm','Her card verification desk. We need her to confirm whether the purchase attempt on her account is hers. She should use her usual branch if she prefers.','block'),
 c('eventcheck-distinct-transaction','scam','charge-alarm','This is a recorded update about her regular service payment, which completed normally. We also found a separate unrecognized transaction.','block'),
 c('eventcheck-information-only','scam','charge-alarm','A financial alert from her online account. An unexpected debit was recorded. There is nothing to do on this call.','block'),
 c('eventcheck-endorsed-command','scam','requested-conduct','The support representative. The other person’s instruction to run that repair command is correct; she should go ahead and run it.','block'),
 c('eventcheck-unrequested-intervention','scam','requested-conduct','A network rescue specialist. We are contacting her without a request because we detected a device problem and want to fix it remotely.','block'),
 c('eventcheck-deferred-secret','scam','requested-conduct','The delivery coordinator about her order. Whenever convenient, she can send us the sign-in code through our message thread to complete the check.','block'),
 c('eventcheck-empty-conversation','scam','empty-contact','I am Devon. Accept our chat invitation and say hello there. I have no reason to pass on.','block'),
 c('eventcheck-followup-results','legit','caution-scope','Her eye clinic following up on the examination. Her results are ready and she does not need further treatment.','approve',true),
 c('eventcheck-followup-work','legit','caution-scope','The carpenter following up on the repair visit. The new handle is available and I want to arrange fitting it.','approve',true),
 c('eventcheck-missed-phone','legit','caution-scope','The pharmacy returning her missed phone call. Her prescription is ready for pickup.','hold',true),
 c('eventcheck-recorded-callback','legit','caution-scope','This automated callback confirms the hospital transport booking she made by phone. The booking is accepted.','message',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('eventcheck-stage-refund','legit',['The account credit team calling about money owed to her.','The return she requested has been processed and we only want to confirm that the credit was issued.'],'approve'),
 s('eventcheck-stage-official','legit',['The records officer about a concern with her file.','She can review the corrected address in person at the office she usually visits; no reply or information is required on this call.'],'approve'),
 s('eventcheck-stage-unclear','unclear',['The account protection team calling about a concern.','I will not tell you what we want her to do until you put her on.'],'hold'),
 s('eventcheck-stage-alert','scam',['The account contact team. Is she there?','An unexplained charge has appeared, and we want her to be aware of it.'],'block'),
 s('eventcheck-stage-contact','scam',['This is Morgan, may I speak with her?','She needs to enter our private discussion and reply there. No subject can be given beforehand.'],'block'),
 s('eventcheck-stage-access','scam',['The service coordinator here. Could she speak to me?','I want her to grant our tool permission to read the documents stored in her account.'],'block'),
];
