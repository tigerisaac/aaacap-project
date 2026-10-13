// Fresh validation authored after v117 froze. Mechanisms independently phrased
// from the FTC's September 2026 enrollment warning and FBI's June 2026
// messaging-account warning. No source transcripts or prior fixture imports.
export const synthetic=true;
export const sources=[
 'https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams',
 'https://www.ic3.gov/PSA/2026/PSA260626',
];
const c=(id,category,focus,text,action)=>({name:`channel-validation-${id}`,category,focus,turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('01','scam','account-secret','Messaging support here. We need her saved recovery phrase so we can preserve her chat history during the update.','block'),
 c('02','scam','account-secret','The group moderator. To reconnect her account, send the verification digits she receives to the moderator in a private reply.','block'),
 c('03','scam','promotion','The senior benefits coordinator. We have a new health plan with a grocery allowance to offer her; she has not asked us to call.','block'),
 c('04','scam','identity-secret','Her health coverage review desk. Read us the full government insurance identifier from her card so we can check the benefits.','block'),
 c('05','scam','empty-contact','This is Neri. Accept my invitation on the social app and then we can get acquainted.','block'),
 c('06','scam','empty-contact','The welcome team. Enter our members-only conversation space. We do not have any subject to share here.','block'),
 c('07','scam','concealment','The account investigation team. She must not discuss our conversation with her relatives or her bank while we work on it.','block'),
 c('08','scam','recovery-payment','Our claims unit can recover the investment money she lost. First, send the processing deposit through the payment app.','block'),
 c('09','legit','ordinary-report','Her nephew. A fake help desk wanted my recovery phrase. I never sent it and want to warn her about the message.','approve'),
 c('10','legit','ordinary-report','Her sister. I think I fell for a benefits advertisement and want to talk about what happened.','approve'),
 c('11','legit','ordinary-service','The volunteer benefits counselor she booked. I am calling to confirm the time of her appointment to compare coverage options.','approve'),
 c('12','legit','ordinary-service','Her clinic scheduler. We need her date of birth to locate the appointment she asked to change.','approve'),
 c('13','legit','ordinary-callback','Her book club friend. Ask her to call me so we can arrange next month’s reading schedule.','approve'),
 c('14','legit','ordinary-invitation','Her neighborhood pottery group organizer. Please join our discussion space to choose the firing date for the pots we made last week.','approve'),
 c('15','legit','saved-notice','This is a recorded reminder from her health plan. The annual coverage statement has been mailed; she can review it at her convenience.','message'),
 c('16','legit','saved-notice','Automated messaging account notice. A new sign-in was detected. Review the account using the application already installed on her phone.','message'),
];
