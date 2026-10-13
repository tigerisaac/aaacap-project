// Authored development contrasts; no public or held-out text.
export const synthetic=true;
const c=(name,category,text,action)=>({name,category,focus:'contact-destination',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('destination-refund-topic','clarify','The credit desk, calling about a reimbursement owed to her.','continue'),
 c('destination-credit-topic','clarify','The account office about money that should be returned to her. I need to discuss it.','continue'),
 c('destination-refund-result','legit','The tailor she hired. The alteration refund she requested has been credited back, and no reply is needed.','approve'),
 c('destination-winnings','scam','The award center. She has won an unexpected cash prize and we want her to collect her winnings.','block'),
 c('destination-recovery-service','scam','We locate lost investments and want to recover money for her. She did not request our service.','block'),
 c('destination-requested-help','legit','Her financial counsellor about the loss report she asked us to prepare. I need to arrange a meeting to review the documents.','approve'),
 c('destination-empty-conference','scam','Connect to the private conference I sent. The subject will be discussed after she joins.','block'),
 c('destination-empty-subscribe','scam','I am Cameron. Subscribe to my messaging space and send me a reply.','block'),
 c('destination-empty-number','scam','Her liaison. Please dial the number in the message to get in touch.','block'),
 c('destination-bare-current','clarify','This is Cameron. Can she speak with me here?','continue'),
 c('destination-contextual-conference','legit','Her choir coordinator. The rehearsal location changed, and I would like her to join the planning discussion to choose a new room.','approve'),
 c('destination-contextual-reply','legit','The glass repair business about her booked window replacement. Please reply to tell us which morning she will be home.','approve'),
 c('destination-family-only','legit','I am her aunt. Could she call me back for a chat?','approve'),
 c('destination-role-billing','legit','The company collecting her household recycling. Her regular service invoice is ready in the usual account.','approve'),
 c('destination-role-delivery','legit','The driver delivering her washing machine. I need to confirm someone will be there this afternoon.','approve'),
 c('destination-unresolved-security','clarify','The account security desk. There is a concern with her account and I need a word.','continue'),
];
export const stagedCases=[];
