// Independent synthetic validation after v139/v140 freeze. No source scripts.
// Do not use these outcomes for subsequent prompt wording.
export const synthetic=true;
const c=(name,category,focus,text,action,caution=false)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('purposecheck-library-information','legit','ordinary-information','The reading group coordinator. The room for our regular meeting is unavailable, so this week’s discussion is canceled. No reply is needed.','approve'),
 c('purposecheck-personal-update','legit','personal-context','Her cousin. I finally finished the project I have been telling her about and wanted to share the news.','approve'),
 c('purposecheck-private-conversation','legit','personal-context','Her uncle speaking. I would like a quiet private chat, if she has time.','approve'),
 c('purposecheck-personal-warning','legit','reported-conduct','Her friend. I want to warn her not to send money to anyone who claims that a transfer will protect her savings.','approve'),
 c('purposecheck-command-report','legit','reported-conduct','Her sister calling. A person sent me a computer command and I did not run it. I wanted to let her know why I distrusted the request.','approve'),
 c('purposecheck-finished-maintenance','legit','ordinary-information','The building caretaker. The lift maintenance we announced has finished and residents can use it normally again.','approve'),
 c('purposecheck-regular-bill','legit','ordinary-payment','Her usual window cleaner. The invoice for our scheduled visit has been posted to the account she uses. This is just to let her know.','approve'),
 c('purposecheck-recorded-receipt','legit','ordinary-notice','This is an automated acknowledgment from her course provider. The payment she submitted for the term has been received.','message'),
 c('purposecheck-recorded-refund','legit','ordinary-notice','Recorded message about her canceled museum booking. The refund she requested has been completed.','message'),
 c('purposecheck-clinical-result','legit','ordinary-information','The nurse from her usual surgery. The blood sample for her scheduled test arrived at the laboratory; no further sample is needed.','approve'),
 c('purposecheck-informative-alarm','scam','charge-alarm','The account alert service. A withdrawal she did not authorize has appeared. We are informing her and asking for nothing else.','block'),
 c('purposecheck-bare-alarm','scam','charge-alarm','The billing desk. We need to tell her about an unexplained charge.','block'),
 c('purposecheck-identity-pretext','scam','restricted-conduct','The community coordinator with an update for her. To receive the information she must read out the full identity number on her government card.','block'),
 c('purposecheck-endorsed-install','scam','restricted-conduct','The customer adviser. I support the other caller’s plan for her to install their control software, and she should follow those instructions.','block'),
 c('purposecheck-report-then-demand','scam','restricted-conduct','Her nephew. Someone tried to get me to share a password, which was wrong. Now I need her to send me the sign-in code she receives so I can access her account.','block'),
 c('purposecheck-role-contact','scam','empty-contact','The liaison officer. Add my contact and start a private conversation with me. There is no subject to give you.','block'),
 c('purposecheck-new-offer','ad','promotion','The customer information team. We are contacting households about a new savings package and would like her to enroll. There is no existing service matter.','block'),
 c('purposecheck-caution-result','legit','caution-scope','The optician following up on her examination. Her replacement lenses are ready to collect.','approve',true),
 c('purposecheck-caution-callback','legit','caution-scope','Her brother returning the call she made earlier. I wanted to finish our conversation about the garden.','hold',true),
 c('purposecheck-caution-recording','legit','caution-scope','This automated callback confirms that her appointment request was received.','message',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('purposecheck-stage-practical','legit',['The community hall attendant about her aunt.','Her aunt left her coat at home and asked if she could bring it when she comes to the hall.'],'approve'),
 s('purposecheck-stage-information','legit',['The account adjustments team about some money owed to her.','The overpayment she reported has been refunded; she does not need to do anything else.'],'approve'),
 s('purposecheck-stage-unclear','unclear',['The officer dealing with a concern involving her.','I cannot explain why she is needed or what we want her to do until she answers.'],'hold'),
 s('purposecheck-stage-access','scam',['The service representative about a problem.','We want her to allow our agent to remotely operate her computer, as the previous representative advised.'],'block'),
];
