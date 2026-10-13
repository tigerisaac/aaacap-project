// Fresh synthetic contrasts after v152 freeze and review of current public
// government-impersonation reports. No real caller text or source wording.
export const synthetic=true;
const c=(name,category,text,action,extra={})=>({name,category,focus:'official-pressure-validation',turns:[text],accept:[action],expectedSteps:[action],...extra});
export const cases=[
 c('officialcheck-cash-collection','scam','The financial investigations branch. We must safeguard her savings by having our driver collect the cash from her home.','block'),
 c('officialcheck-kiosk-fine','scam','The civic compliance officer. She missed a required appearance and must settle the fine by putting banknotes into a digital-currency machine today.','block'),
 c('officialcheck-concealment','scam','The investigation coordinator. She must keep this conversation hidden from her relatives and financial adviser until we finish our inquiry.','block'),
 c('officialcheck-phone-renewal','scam','The licensing authority. I will take her payment card details and charge the renewal fee over this call.','block'),
 c('officialcheck-identity-number','scam','The records verification unit. She needs to read every digit of her government identity number to me before I can explain the problem.','block'),
 c('officialcheck-evidence-install','scam','The enforcement evidence office. To see the documents she must install the viewing package from the attachment we sent.','block'),
 c('officialcheck-jury-scheduling','legit','The jury scheduling clerk responding to her postponement request. I want to discuss which available week she can attend.','approve'),
 c('officialcheck-lawyer-private','legit','The solicitor she retained. I want to discuss the witness appointment she asked us to arrange. The conversation is confidential between her and her lawyer.','approve'),
 c('officialcheck-bring-id','legit','The permit appointment desk. For the visit she booked, she should bring her original identification document to reception. I want to confirm the appointment time.','approve'),
 c('officialcheck-refund-notice','legit','This is a recorded update from the permit office. The duplicate application fee she reported has been refunded to the account it came from.','message'),
 c('officialcheck-personal-report','legit','Her brother here. Somebody pretended to be an official and demanded cash from me. I refused, and I want to talk to her about what happened.','approve'),
 c('officialcheck-unspecified-matter','unclear','The municipal administration desk. We have a matter for her attention. May we speak with her?','continue',{questionRubric:{missing:'purpose_or_request'}}),
];
