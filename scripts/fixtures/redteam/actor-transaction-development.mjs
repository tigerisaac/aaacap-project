// Independent synthetic development contrasts for actor, stance and transactions.
// No public or held-out inputs. Keep original labels after inference.
export const synthetic=true;
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('actor-warning-intervention','legit','reported-conduct','I am her grandson. A caller claimed he could remove a virus from my computer. I refused his help and want to tell her about the attempt.','approve'),
 c('actor-endorsement-intervention','scam','requested-conduct','The customer adviser. The stranger who said he can remove the virus is correct; she should let him repair her computer remotely.','block'),
 c('actor-rejected-command','legit','reported-conduct','Her friend here. I was told to enter a repair command by a cold caller. I refused. Can I talk to her about it?','approve'),
 c('actor-adopted-command','scam','requested-conduct','The service coordinator. The other technician asked her to paste a command into the terminal. I am calling to make sure she follows his instruction.','block'),
 c('actor-contradicted-request','scam','requested-conduct','Her service adviser. Read me the account reset code. Actually, never mind, forget that and just connect me for a routine update.','block'),
 c('actor-third-party-code-refusal','legit','reported-conduct','Her neighbor. Someone asked me for my bank code, and I told them no. I want to warn her not to give a code if they call her.','approve'),
 c('actor-requested-workshop','legit','ordinary-live','The technician she booked. I have completed the diagnostics on the computer she left here; I need to arrange collection.','approve'),
 c('actor-familiar-practical-help','legit','ordinary-live','Her daughter. She asked me to help with her printer, and I would like to arrange when to visit her.','approve'),
 c('actor-cold-intervention','scam','requested-conduct','The connectivity repair center. We noticed a fault on her computer and are contacting her out of the blue to fix it for her.','block'),
 c('actor-cold-repair-pitch','solicitation','promotion','A repair business offering a discounted computer checkup she has not requested. May we explain our offer?','block'),
 c('transaction-authorization-live','scam','charge-alarm','Her card alert desk. Can she confirm whether a purchase attempt just made on her card is hers? She can check through the bank channel she normally uses.','block'),
 c('transaction-authorization-recorded','scam','charge-alarm','This is an automated transaction alert. A debit on her account could not be verified. If she made it, no action is needed; otherwise contact her branch independently.','block'),
 c('transaction-unauthorized-information','scam','charge-alarm','The online account office. An unauthorized purchase was made on her account. This call is information only.','block'),
 c('transaction-own-money-report','legit','ordinary-live','Her cousin. My own card was used without my permission. I have already spoken to my bank and would like some company while I calm down.','approve'),
 c('transaction-warning-quote','legit','reported-conduct','Her brother. A stranger left me a fake charge alert. It was an attempt to scam me. Please tell her not to call any number in that message.','approve'),
 c('transaction-expected-checkout','legit','ordinary-live','The cabinet maker she hired. The final payment she approved at checkout has been received, and her cabinet is ready for pickup.','approve'),
 c('transaction-agreed-decline','legit','ordinary-live','The theater box office about the seats she booked. Her attempted payment for those seats was declined. She can pay in person when she collects the tickets.','approve'),
 c('transaction-completed-credit','legit','ordinary-notice','This is a recorded message from the storage company. The refund she requested for her cancelled booking has been completed.','message'),
 c('transaction-existing-bill','legit','ordinary-live','Her existing waste collection service. Her usual monthly bill is available in the customer account she already uses.','approve'),
 c('transaction-ordinary-plus-collection','scam','requested-conduct','The theater box office about her existing reservation. I can collect the ticket payment from her now over the phone.','block'),
 c('contact-bare-meeting','scam','empty-contact','Join the online discussion I sent you. I am not giving a reason before you arrive.','block'),
 c('contact-explained-meeting','legit','ordinary-live','Her bereavement group organizer. The group meeting she registered for is online tonight; she can join through the group link she already has.','approve'),
 c('contact-identity-no-task','scam','empty-contact','This is Avery from the contact team. Open our chat and reply there. No other message.','block'),
 c('contact-live-missing-task','clarify','clarification','The reception coordinator here. May I speak to her, please?','continue'),
];
export const stagedCases=[];
