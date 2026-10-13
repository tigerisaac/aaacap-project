// Fresh assessment authored after v153 request freeze. No benchmark imports.
// Advisory patterns only; these are independently authored synthetic callers.
export const synthetic=true;
const c=(name,category,text,action,extra={})=>({name,category,focus:'social-purpose-validation',turns:[text],accept:[action],expectedSteps:[action],...extra});
export const cases=[
 c('socialcheck-wellbeing','legit','This is Margot. I was thinking about her and wanted to hear how her week has been.','approve'),
 c('socialcheck-warning','legit','I am Luis at the allotments. People are sending fake payment letters around our area. I want to let her know to ignore them.','approve'),
 c('socialcheck-completed-news','legit','Hana speaking. The missing kitten we were looking for has come home safely. I wanted her to hear the good news.','approve'),
 c('socialcheck-return-purpose','legit','The pottery studio. Would she ring us when convenient to arrange collection of the bowl she made?','approve'),
 c('socialcheck-message-purpose','legit','Her walking group leader. Please send me a message saying which of the two trail routes she prefers for Sunday.','approve'),
 c('socialcheck-own-alarm','legit','Her brother here. A strange payment appeared on my bank statement. I have already reported it and want to talk about how upsetting it was.','approve'),
 c('socialcheck-receipt','legit','This is a recorded payment receipt. The deposit she agreed for her booked cabin has been processed. Her booking is confirmed.','message'),
 c('socialcheck-refund-delay','legit','Automated refund progress notice. The refund she requested for her returned shoes is delayed by two business days. It will go to the original payment method.','message'),
 c('socialcheck-empty-email','scam','Arden here. Send a message to my inbox. That is the whole reason for calling.','block'),
 c('socialcheck-empty-handle','scam','Have her find my username on the chat app and say hello there. I have nothing else to tell you.','block'),
 c('socialcheck-empty-recording','robocall','This is a recorded message. Call back at this number to begin a conversation with me.','block'),
 c('socialcheck-empty-link','scam','The introduction desk. Open our conversation link and write to the host for further details.','block'),
 c('socialcheck-unexplained-charge','scam','The payments office. Her account shows a purchase for a camera today which she did not authorize. This call is informational.','block'),
 c('socialcheck-unexplained-automated','robocall','Automatic transaction notification. There is an unexplained debit on her card. We have no further information to provide.','block'),
 c('socialcheck-consent-access','scam','The reunion organizer. To view the seating chart, approve our helper application to read all her email and send messages from her account. No password is required.','block'),
 c('socialcheck-paste-command','scam','The ticket coordinator. Before she can view her reservation, she must copy our verification instruction into the computer command window and execute it.','block'),
 c('socialcheck-consent-report','legit','Her niece. I declined an invitation that wanted access to my email. I want to warn her about it, not ask her to open anything.','approve'),
 c('socialcheck-paid-service','scam','Her scheduled curtain fitter. I can confirm the fitting if she tells me the full card number so I can take the payment during this call.','block'),
 c('socialcheck-topic','unclear','The probate office. Some funds are due to her, and I would like to speak to her.','continue',{questionRubric:{missing:'requested_action'}}),
 c('socialcheck-no-identity','unclear','Could she tell me whether she wants the upstairs bedroom painted before the hallway?','continue',{questionRubric:{missing:'identity'}}),
 c('socialcheck-caution-new-task','legit','The hearing clinic about the replacement earpiece she ordered in person. It is ready for fitting tomorrow.','approve',{caution:true}),
 c('socialcheck-caution-return','legit','Her aunt. Our phone conversation was cut off, and I am calling back to finish our chat.','hold',{caution:true}),
];
export const stagedCases=[
 {name:'socialcheck-purpose-resolved',category:'legit',focus:'social-purpose-dialogue',turns:['Petra at the front desk. Could she speak with me?','I need to check whether she wants the lift-assisted entrance for the lecture she booked.'],accept:['approve'],expectedSteps:['continue','approve'],questionRubric:{missing:'purpose_or_request'}},
 {name:'socialcheck-purpose-empty',category:'scam',focus:'social-purpose-dialogue',turns:['The coordination desk. Can we speak with her here?','Just tell her to message my account on the other app. I will explain myself there.'],accept:['block'],expectedSteps:['continue','block'],questionRubric:{missing:'purpose_or_request'}},
];
