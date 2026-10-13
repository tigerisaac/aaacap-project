// Fresh synthetic callers authored after v121 froze, before inspecting its
// inference. No public or previous held-out imports. Never tune on this set.
export const synthetic=true;
const c=(id,category,focus,text,action)=>({name:`relationship-name-${id}`,category,focus,turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('01','legit','social-context','We play badminton together on Sundays. I wanted to catch up with her.','approve'),
 c('02','legit','social-context','It is her nephew on a borrowed phone. Could I have a word with her about something personal?','approve'),
 c('03','legit','ordinary-callback','The municipal road inspector returning her report of a pothole. Please have her call to arrange a time for us to inspect the location she reported.','approve'),
 c('04','legit','completed-refund','The hardware counter. The special-order hinges were unavailable, so we have already credited her original payment. I am calling to let her know.','approve'),
 c('05','legit','care-coordination','Her medication delivery coordinator. I need to confirm the delivery address for the prescription she is expecting tomorrow.','approve'),
 c('06','legit','mixed-service-offer','The photo studio about the portrait session she booked. We need to confirm the arrival time; she can also look at our optional print packages when she arrives.','approve'),
 c('07','legit','notice','Recorded message from the parking office. The permit she renewed has been mailed and should arrive within a week.','message'),
 c('08','legit','notice','This is an automated card activity notice. There is a transaction she may not recognize. She can review it through the banking application she already uses.','message'),
 c('09','scam','empty-contact','Jules speaking. Please send an email to the inbox I will give you. That is the entire reason I called.','block'),
 c('10','scam','empty-contact','The outreach secretary. Accept the chat connection from our profile. We have no other purpose to share.','block'),
 c('11','scam','empty-contact','Contact this new number after the call. I am not stating any subject, service or relationship.','block'),
 c('12','scam','secrets','The account administrator. To recover her messages, read the saved account recovery key to me.','block'),
 c('13','scam','payment','Her grandson. I need her to buy prepaid cards and read their numbers to the officer with me.','block'),
 c('14','scam','concealment','Her account investigator. Do not discuss our conversation with a bank employee or family member; they would interfere with the operation.','block'),
 c('15','unclear','missing-purpose','This is Sage from the coordination office. Could she take the call?','continue'),
 c('16','unclear','unresolved-alarm','The card activity team. There is a charge she may not recognize, and I need to talk to her about it.','continue'),
];
const s=(id,category,turns,action)=>({name:`relationship-name-${id}`,category,focus:'native-clarification',turns,accept:[action],expectedSteps:['continue',action]});
export const stagedCases=[
 s('17','legit',['This is Lee. Is she available?','We are friends from the allotments. I wanted to arrange a time to return her wheelbarrow.'],'approve'),
 s('18','legit',['The appointments coordinator. May I speak with her?','She booked a furniture collection. I am confirming that the van will arrive before lunch.'],'approve'),
 s('19','scam',['The account desk. Can I speak with her?','I need her to authorize our app to read all her email so we can check her identity.'],'block'),
 s('20','unclear',['The investigation office concerning a possible offense involving her.','I will not explain what happened or say what I want her to do.'],'hold'),
];
