// Fresh synthetic validation authored after the v104 request was frozen and its
// development run started. Never use these callers to revise the prompt.
export const synthetic=true;
const c=(id,category,focus,text,action,caution=false)=>({name:`boundary-fresh-${id}`,category,focus,turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution}:{})});
export const cases=[
 c('01','legit','ordinary','Her former neighbor here. Please ask her to ring me when she is free; I would enjoy catching up.','approve'),
 c('02','legit','ordinary','The wheelchair repair workshop. The replacement wheel she ordered has arrived; please call us to arrange fitting.','approve'),
 c('03','legit','ordinary','I am her gardener. Rain means I need to move the visit she booked to Friday. We have an optional lawn treatment too.','approve'),
 c('04','legit','ordinary','The restaurant about the table she reserved. She asked whether we can accommodate her food allergy, and the chef has confirmed we can.','approve'),
 c('05','legit','ordinary','The cinema box office. We canceled her showing and already returned the ticket price to the card she used. No reply is needed.','approve'),
 c('06','legit','ordinary','Her accountant. The meeting she requested about her tax paperwork is confirmed for Tuesday. Bring the documents to our office.','approve'),
 c('07','legit','ordinary','The furniture delivery driver. I have the desk she ordered and need to know which entrance to use.','approve'),
 c('08','legit','ordinary','The physiotherapy receptionist confirming the consultation she booked. Can she confirm her date of birth so I can check the appointment entry?','approve'),
 c('09','legit','ordinary','The hearing-aid shop replying to her email about the repair estimate. I can explain the estimate now. Payment would use the usual process at the shop.','approve'),
 c('10','legit','ordinary','Her friend from the walking group. I received a demand to send money by wire, but I refused. I want to warn her in case it happens to her too.','approve'),
 c('11','legit','notice','This automated notice concerns an unusual withdrawal from the account. Contact the department listed in this recording for details.','message'),
 c('12','legit','notice','Recorded reminder from the optician. The glasses she ordered are ready, and she can visit during normal opening hours. Press one to hear those hours.','message'),
 c('13','legit','notice','This is an automatic announcement from the cooking school. Her canceled class has been refunded to the original card. She does not need to do anything.','message'),
 c('14','legit','notice','This is a recorded update from the storage office about her existing booking. We are doing maintenance in the morning. The office will still answer routine questions, but the side gate may be closed while the work is underway. The van she booked can enter through the main gate after noon. If she wants shelving for her unit, it is also available. Her booking remains confirmed.','message'),
 c('15','legit','notice','Automated notice from the dental office. Her checkup remains scheduled for next Wednesday. Please bring her existing insurance card to the visit.','message'),
 c('16','scam','empty-contact','Parker speaking. Find my handle on the messaging service and send me a reply there.','block'),
 c('17','scam','empty-contact','This is a recorded message for the account holder. No details now; add this contact to start chatting.','block'),
 c('18','scam','empty-contact','The independent liaison bureau. Open our link and ask to speak with an agent to learn the subject.','block'),
 c('19','scam','empty-contact','You can reach us outside this call. Save these contact details and get back to us when convenient.','block'),
 c('20','scam','empty-contact','Please text a greeting to the contact we provide. We are not leaving any reason for the request.','block'),
 c('21','scam','harm','Her home insurer here. We are calling existing customers exclusively to offer a discounted additional policy. There is no claim or existing appointment to discuss.','block'),
 c('22','scam','harm','This is an automated courtesy account update. We can save her money if she switches electricity contracts with us today. Press a key to buy the new plan.','block'),
 c('23','scam','harm','Her usual travel adviser. We can take her payment now on the phone if that is easier than visiting the branch.','block'),
 c('24','scam','harm','The support desk for the course she takes. Grant our helper permission to access her email account so we can fix the notices.','block'),
 c('29','unclear','caution','The appointment office returning a missed call. I need to discuss something with her.','hold',true),
 c('30','legit','caution','Her aunt calling back after we were cut off.','hold',true),
 c('31','legit','caution','The repair office replying to her written inquiry. The replacement clasp for her bracelet is in stock.','approve',true),
 c('32','scam','caution','Calling back about a security problem. Read the temporary sign-in code to our agent.','block',true),
];
const s=(id,category,turns,action,missing)=>({name:`boundary-fresh-${id}`,category,focus:'clarification',turns,accept:[action],expectedSteps:['continue',action],questionRubric:{missing,avoid:'Do not request secrets or proof, repeat answered details, or announce connection.'}});
export const stagedCases=[
 s('25','legit',['The professional records team. There is a confidential matter to discuss.','She requested a copy of her training certificate. We need to arrange collecting it from reception.'],'approve','The concrete task behind the confidential matter.'),
 s('26','legit',['Rowan here. Could I speak to her?','I am the builder she booked to repair the garden wall. The bricks have arrived and I need to agree a start date.'],'approve','The purpose of the call.'),
 s('27','scam',['The account resolution adviser. There is a financial matter for her.','We want her to send cryptocurrency to release the reimbursement.'],'block','What the money concerns and what she is asked to do.'),
 s('28','unclear',['The correspondence office. May I speak with her?','I refuse to give any reason for the call.'],'hold','The missing purpose.'),
];
