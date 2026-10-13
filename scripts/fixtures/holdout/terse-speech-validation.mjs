// Independent synthetic validation after v139/v140 freeze. Terse conversational
// speech without explanatory safety labels. Never use these outcomes for wording.
export const synthetic=true;
const c=(name,category,text,action)=>({name,category,focus:'terse-speech',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('tersecheck-contact','scam','Hello, it’s Nina. Put this number in your messenger and say hi.','block'),
 c('tersecheck-family','legit','Hey Mum, it’s your daughter. Ring when you’ve got a minute.','approve'),
 c('tersecheck-service-callback','legit','Lewis, from the garage. Your van’s ready. Give us a bell.','approve'),
 c('tersecheck-role-contact','scam','Riley here, account coordinator. Drop me a message when you get this.','block'),
 c('tersecheck-family-code','scam','Hey auntie, it’s your nephew. I need the code that just landed so I can get into your email.','block'),
 c('tersecheck-charge','scam','Card services. I’m showing a new payment for a device. Was that you?','block'),
 c('tersecheck-receipt','legit','This is an automated message from the pottery studio. Your payment for the class you booked has gone through.','message'),
 c('tersecheck-decline','legit','Hi, it’s the pool office. The debit for your usual swim pass didn’t go through. It’s in your member portal.','approve'),
 c('tersecheck-refund','legit','Hello, the florist here. That bouquet you canceled—we’ve put the money back on the card you paid with.','approve'),
 c('tersecheck-recovery','scam','Hi, Joanna here. We traced the funds you lost. I can get them released to you.','block'),
 c('tersecheck-own-report','legit','It’s your brother. A guy rang about my bank balance. I told him to get lost. Can I tell you what happened?','approve'),
 c('tersecheck-adopted-command','scam','This is Dan from support. The other adviser told her to open that terminal and paste the command. He was right. Let’s do that now.','block'),
 c('tersecheck-notice','legit','Recorded notice from the bookshop. Your reserved copy is ready at the counter.','message'),
 c('tersecheck-pitch','ad','Morning, Rowan here from home plans. We can get her onto a cheaper package.','block'),
];
const s=(name,category,turns,final)=>({name,category,focus:'terse-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('tersecheck-stage-property','legit',['Hi, it’s Pat, from the local office.','Just checking when she can collect the jacket she left with us.'],'approve'),
 s('tersecheck-stage-credit','scam',['Accounts here, there’s a credit due.','Tell her to get the prepaid voucher first, then we can release it.'],'block'),
];
