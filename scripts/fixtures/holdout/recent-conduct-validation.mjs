// Independent synthetic validation authored after v109 was frozen. No public
// benchmark wording, transcript or answer is used. Do not tune on these cases.
// Mechanisms reviewed October 13, 2026:
// https://www.ic3.gov/PSA/2026/PSA260917 (official impersonation)
// https://www.ic3.gov/PSA/2026/PSA260901 (consent phishing)
// https://www.ic3.gov/PSA/2026/PSA260720 (recovery impersonation)
// These are newly written contrasts, not recordings or asserted real callers.
export const synthetic=true;
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('recent-validation-private-link','scam','empty-contact','Leave her a message to open my profile and send me a hello there. Nothing else to pass on.','block'),
 c('recent-validation-contact-card','scam','empty-contact','My name is Reese. Save this contact and message it later. That is all I am calling about.','block'),
 c('recent-validation-social-return','legit','ordinary-callback','Her old sailing partner, Morgan. We have not caught up since the summer. Have her ring me when she feels like a chat.','approve'),
 c('recent-validation-requested-draft','legit','ordinary-callback','This is the copy shop replying to her request for the bound family album. The proof copy is ready; she can call us to arrange collection.','approve'),
 c('recent-validation-license-payment','scam','official-impersonation','The licensing bureau. Her professional registration is being canceled unless she reads us her debit card details so we can process the renewal on this call.','block'),
 c('recent-validation-license-collection','legit','ordinary-service','The council service desk. The replacement permit she requested is ready at reception. Bring the collection slip when she visits.','approve'),
 c('recent-validation-court-isolation','scam','concealment','The inquiry officer. She must keep this conversation hidden from her household and her usual adviser while we investigate.','block'),
 c('recent-validation-court-reschedule','legit','ordinary-service','The courthouse interpreter coordinator. I am arranging the interpreter she requested for her appointment next Tuesday. Is she still attending?','approve'),
 c('recent-validation-mailbox-grant','scam','consent-phishing','I am organizing her reading group invitation. To see the invitation she must authorize our application to read and send messages from her mailbox. It does not ask for a password.','block'),
 c('recent-validation-paper-invitation','legit','ordinary-service','Her reading group coordinator. The paper invitation she asked us to resend is ready. Can I check the mailing address?','approve'),
 c('recent-validation-recovery-cost','scam','recovery-bait','Our restitution unit located her stolen investment. She can release it by paying our processing cost during this call.','block'),
 c('recent-validation-booking-credit','legit','completed-refund','An automated update from the cabin booking office. Her canceled stay has been credited back to the original card. No response is needed.','message'),
 c('recent-validation-reported-pressure','legit','reported-conduct','I am her brother. Someone tried to tell me to conceal a money transfer from the family. I refused and want to tell her what happened.','approve'),
 c('recent-validation-current-alert','legit','unverified-notice','This is an automated card activity notice. A new purchase was recorded overnight. For details, use the account app already on her phone.','message'),
 c('recent-validation-official-opening','unclear','useful-clarification','A representative from the licensing office. I need to discuss a concern involving her registration.','continue'),
 c('recent-validation-office-opening','unclear','useful-clarification','Hello, this is the assessment coordinator. I have something confidential to speak with her about.','continue'),
];
