// Authored after v150 freeze. Fresh assessment, not a tuning source.
// Current scam reports informed categories only; all speech is newly authored.
export const synthetic=true;
const c=(name,category,text,action,caution=false)=>({name,category,focus:'recording-consistency-validation',turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('recordingcheck-kin-brief','legit','Her aunt. Ask her to ring me when she has a moment; I want to talk about our holiday plans.','approve'),
 c('recordingcheck-business-return','legit','The curtain repair shop returning her enquiry. We can mend the lining she showed us. Could she call to arrange a drop-off?','approve'),
 c('recordingcheck-message-history','legit','Her swimming partner. I got a recording claiming a payment had appeared on my card. I ignored it and want to tell her what happened.','approve'),
 c('recordingcheck-practical-chat','legit','Her decorator. She asked for photos of the finished room; please ask her to message me so I can send them.','approve'),
 c('recordingcheck-payment-received','legit','The appliance workshop. Her payment for the repair is in, and I am calling to arrange when she can collect the mixer.','approve'),
 c('recordingcheck-government-practical','legit','The municipal recreation office. She requested an accessible entrance for her booked class; I am calling with the arrangements.','approve'),
 c('recordingcheck-routine-current','legit','Automatic notification from the library: the book she reserved is available at the collection desk.','message'),
 c('recordingcheck-receipt-current','legit','Recorded receipt from the garden club. Her annual membership payment has been received. This confirms the renewal she requested.','message'),
 c('recordingcheck-refund-current','legit','This is a recorded update from the theatre. We have returned the price of her cancelled performance to her original payment method. No reply is needed.','message'),
 c('recordingcheck-security-current','legit','This is an automated account notice. Her email recovery address was updated. She can review this using the settings she normally uses.','message'),
 c('recordingcheck-empty-add','scam','Please have her add this number to her messaging contacts and send me a hello.','block'),
 c('recordingcheck-empty-name','scam','Morgan speaking. Tell her to call me on the other number I provided. That is the entire message.','block'),
 c('recordingcheck-uninvited-job','ad','We are inviting new people to an easy earning programme. She can join our messaging group to receive paid tasks.','block'),
 c('recordingcheck-charge-robot','scam','This is an automated purchase alert. A large electronics payment has just appeared on her card and may not be hers.','block'),
 c('recordingcheck-charge-human','scam','The online account desk. An order has charged her card without her knowledge. I am calling to notify her of that transaction.','block'),
 c('recordingcheck-courier-security','scam','The financial investigation desk. Her savings need protection, so she must withdraw the cash for our bonded courier to collect.','block'),
 c('recordingcheck-consent-access','scam','The event host. To see our invitation she needs to allow our app to read and manage her email account. No password has to be shared.','block'),
 c('recordingcheck-secrecy','scam','The licensing investigator. She must discuss this alone and keep it from her family and advisers while we deal with the case.','block'),
 c('recordingcheck-caution-return','legit','Her cousin. Our call disconnected before we finished planning the meal, so I am calling straight back.','hold',true),
 c('recordingcheck-caution-service','legit','The optician she booked with. Her replacement lenses have arrived and I need to arrange the fitting appointment.','approve',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'recording-consistency-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('recordingcheck-incomplete-callback','legit',['Avery calling. May I speak to her?','I am her allotment neighbour. We need to arrange watering while she is away.'],'approve'),
 s('recordingcheck-claim-resolved','legit',['The accounts office about a credit due to her.','Her course was cancelled. I need to confirm which remaining class she would like us to apply the credit to; we do not need any payment details.'],'approve'),
 s('recordingcheck-claim-escalated','scam',['The accounts office about a credit due to her.','She should tell me the one-time login code from her banking app so we can release it.'],'block'),
 s('recordingcheck-claim-refused','unclear',['The review desk about a benefit available to her.','I cannot explain what she is required to do. Only she can hear that.'],'hold'),
];
