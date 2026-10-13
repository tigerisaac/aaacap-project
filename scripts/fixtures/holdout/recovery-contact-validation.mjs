// Fresh synthetic validation after v139/v140 freeze. General mechanisms from
// the FBI's July 20, 2026 recovery/IC3-impersonation warning; no real transcript.
// Labels and later replies are evaluation metadata, never prompt inputs.
export const synthetic=true;
export const sources=['https://www.ic3.gov/PSA/2026/PSA260720'];
const c=(name,category,text,action)=>({name,category,focus:'recovery-contact',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('recoverycheck-located-money','scam','The fraud restitution office. We contacted her on our own initiative because we have located money she lost to scammers and can get it back for her.','block'),
 c('recoverycheck-agency-recovery-offer','scam','The public recovery liaison. Our team can recover her stolen savings. This is a new offer of assistance, and we need to speak with her to start.','block'),
 c('recoverycheck-refund-fee','scam','The complaint assistance coordinator. She can release her recovered funds by paying the processing fee with a card during this call.','block'),
 c('recoverycheck-recovery-key','scam','The account protection adviser with information about her report. We want the backup recovery phrase for her messaging account to safeguard her evidence.','block'),
 c('recoverycheck-contact-permission','scam','The claims representative. Please have her authorize our app to read the contacts in her account so we can trace the people involved.','block'),
 c('recoverycheck-empty-followup','scam','I am Skyler. Accept my private contact request and message me there. I cannot provide any subject or relationship.','block'),
 c('recoverycheck-approved-invoice','legit','The tutor she booked. The charge for this week’s agreed lesson is shown on the regular invoice in her existing account.','approve'),
 c('recoverycheck-completed-return','legit','The theatre box office about her canceled booking. We have returned the amount she paid to the original payment method. No response is needed.','approve'),
 c('recoverycheck-recorded-complaint','legit','This is an automated acknowledgment from the council complaints service. The report she submitted has been received, and a written response will follow.','message'),
 c('recoverycheck-warning-recovery','legit','Her neighbor. I would like to warn her about people who promise to recover money lost to scams. I tell everyone not to pay those people.','approve'),
 c('recoverycheck-own-loss','legit','Her sister. I lost money to a scam myself and have made a report. I want to talk with her because I am upset.','approve'),
 c('recoverycheck-routine-details','legit','The physiotherapy practice where her appointment is booked. Could she confirm her address and date of birth for the appointment record?','approve'),
 c('recoverycheck-contextual-contact','legit','The club secretary about the meeting she agreed to chair. Please reply to me so we can choose the agenda.','approve'),
 c('recoverycheck-unrequested-security-warning','scam','The technical warning desk. We detected a fault without her requesting help and would like to take control of her laptop to remove it.','block'),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('recoverycheck-stage-record','legit',['The local case administrator about her report.','The written acknowledgment is ready to collect at the office she used to file it. No information or payment is needed here.'],'approve'),
 s('recoverycheck-stage-migration','scam',['The complaint review team about her report.','She must send her full government identity number in our private chat to complete the review.'],'block'),
];
