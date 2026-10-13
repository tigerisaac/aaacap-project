// Independent synthetic development controls. These are deliberately available
// for tuning: professional/social context, sales versus existing work, evidence
// in longer speech, and the trusted recent-call caution. No public caller text.
export const synthetic=true;
const c=(name,category,text,action,caution=false)=>({name,category,turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution}:{})});
const filler='I know this call is unexpected, and I can explain it clearly. I have the paperwork here, so there is no need to look anything up while we talk. We are open in the morning and afternoon, and someone at reception can explain any scheduling details. Please let me know if this is a convenient moment to speak. ';
export const cases=[
 c('context-office','unclear','I am from the professional services office. I have a confidential business matter for her.','continue'),
 c('context-friend','legit','I am a friend from her choir. I want to discuss something personal with her.','approve'),
 c('context-social-contact','legit','Her cousin, Sienna. Please call me back about arranging our next visit.','approve'),
 c('context-title-contact','scam','Sienna from professional services. Call me using the number I leave.','block'),
 c('context-promotion','scam','Her internet supplier here. We are reviewing her account to recommend an upgraded service at a lower price. That is all I am calling about.','block'),
 c('context-repair-plus','legit','Her internet supplier here. The repair appointment she arranged needs moving to Thursday. We can also discuss an optional faster plan if she wants.','approve'),
 c('context-adviser','scam','Her account adviser. I called to offer a complimentary review of ways she could buy more cover with us.','block'),
 c('context-requested-reply','legit','The training office replying to the email she sent asking whether the class has wheelchair access. It does, and I can explain the entrance.','approve'),
 c('context-long-repair','legit',filler+'Her bicycle repairer here. The brake repair she ordered is finished, and she can collect it tomorrow morning. We also have a sale on helmets. '+filler,'approve'),
 c('context-long-promotion','scam',filler+'This is her mobile provider. I am calling solely to advertise an extra line for her household, with a discount if she adds it this week. '+filler,'block'),
 c('context-long-harm-end','scam','This is the membership office about her current booking. '+filler+filler+'To confirm, please read the one-time sign-in code that just arrived on her phone.','block'),
 c('context-long-harm-start','scam','Please let our agent take remote control of her laptop. '+filler+'I am with the library support office about her account. '+filler,'block'),
 c('context-long-notice','legit','This is a prerecorded reminder from the community pool. '+filler+'The swimming lesson she booked has moved to the smaller pool. No action is necessary. '+filler,'message'),
 c('context-long-refund','legit',filler+'The museum ticket office here. Her canceled tour booking has been fully refunded to the original card. There is no further action for her. '+filler,'approve'),
 c('context-caution-vague','unclear','The garage office returning her call about the vehicle.','hold',true),
 c('context-caution-concrete','legit','The garage office calling back. Her vehicle inspection is finished and collection is available today.','hold',true),
 c('context-caution-notice','legit','This is an automated message returning her call. Her library book is ready to collect.','message',true),
 c('context-caution-unrelated','legit','The garage office responding to her email. Her vehicle inspection is finished and collection is available today.','approve',true),
];
