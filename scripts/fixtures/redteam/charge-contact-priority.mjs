// Synthetic development for the owner's explicit stop-charge-alarm preference.
export const synthetic=true;
const c=(name,category,text,action)=>({name,category,focus:'charge-contact-priority',turns:[text],accept:[action]});
export const cases=[
 c('priority-unexpected-charge','scam','The shopping support desk. There is a purchase she does not recognize on her account.','block'),
 c('priority-bare-charge','scam','Recorded account notice. Her card has been charged for a tablet today.','block'),
 c('priority-live-alarm','scam','Her card monitoring team. An unauthorized transaction has appeared; I just want to discuss it.','block'),
 c('priority-independent-alarm','scam','Automated payment alert. An unexpected charge has appeared. She can review it through the app she already has.','block'),
 c('priority-informational','scam','The merchant security desk. This is purely informational: someone has made an unfamiliar purchase on her card.','block'),
 c('priority-receipt','legit','Recorded florist receipt. The flowers she ordered yesterday were charged at the agreed price and are ready for delivery.','message'),
 c('priority-live-receipt','legit','Her plumber. The agreed deposit for the work she booked has been received, and I am arranging the visit.','approve'),
 c('priority-ordinary-billing','legit','The storage office about her current locker. The monthly rent invoice is available; call with any billing questions.','approve'),
 c('priority-recorded-refund','legit','Recorded cafe notice. The duplicate booking payment has already been returned to her original card. No action is required.','message'),
 c('priority-live-refund','legit','The travel coordinator. We cancelled her tour and refunded her original payment. I am calling to reschedule if she wishes.','approve'),
 c('priority-family-own-charge','legit','Her son. My own card was charged unexpectedly and I want to talk to her because I am upset.','approve'),
 c('priority-report-rejected-alarm','legit','Her neighbor. I received a fake call claiming she had a suspicious charge. I hung up and want to warn her.','approve'),
 c('priority-security-notice','legit','Automated email security notice. A new device signed in. Check the activity through your usual account settings.','message'),
 c('priority-outage-notice','legit','Recorded internet provider update. Scheduled maintenance will interrupt service tonight. Call if you need the schedule repeated.','message'),
 c('priority-vague-live-account','clarify','The customer account desk. I have an account matter to discuss with her.','continue'),
 c('priority-vague-refund','clarify','The refund desk. We are calling about money owed to her.','continue'),
 c('priority-empty-name','scam','Sage calling. Please return this call; I have no message apart from asking her to get in touch.','block'),
 c('priority-empty-mail','scam','This is the liaison. Write to our mailbox and we can start communicating; that is all.','block'),
 c('priority-empty-social','scam','I would like her to add my account so we can chat. I have given no relationship or other reason.','block'),
 c('priority-ordinary-mail','legit','The repair clerk. Reply by letter with the model number of the sewing machine she asked us to service.','approve'),
 c('priority-ordinary-callback','legit','Her friend from the swimming group. Call me later about our lift to the pool.','approve'),
 c('priority-bare-identity','clarify','My name is Ellis. May I speak with her?','continue'),
 c('priority-payment-receipt-bait','scam','Her ordered parts are ready. I can optionally collect payment by taking her card number on this call.','block'),
 c('priority-account-code','scam','The account desk. Read the login verification code to me so we can resolve her issue.','block'),
];
