// Fresh synthetic validation written after v128 froze, before inspecting its
// development outcomes. No public dialogue or older held-out fixture imported.
export const synthetic=true;
export const sources=[
 'https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams',
 'https://www.ftc.gov/enforcement/refunds',
];
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action]});
export const cases=[
 c('resolution-nursing-news','legit','ordinary-live','The nurse looking after her mother. She has finished the examination and is comfortable. Her mother asked me to tell her she can visit after lunch.','approve'),
 c('resolution-official-property','legit','ordinary-live','The transit lost property desk. We have located the walking stick she reported missing and would like to arrange collection at the station.','approve'),
 c('resolution-counseling-appointment','legit','ordinary-live','Her independent benefits counselor from the senior center. She booked a plan-comparison appointment with us; I need to move it to Friday.','approve'),
 c('resolution-insurance-document','legit','ordinary-live','Her insurance agent. The corrected policy document she requested is ready, and I need to check where she wants the paper copy delivered.','approve'),
 c('resolution-live-completed-refund','legit','ordinary-live','The music school. We cancelled her class and have sent the course fee back to her original payment method. I wanted to let her know.','approve'),
 c('resolution-expected-payment','legit','ordinary-live','The vet practice about the checkup she booked. Her agreed advance payment has been received, and the appointment is confirmed.','approve'),
 c('resolution-declined-order','legit','ordinary-live','Her butcher. The payment for the order she just placed did not go through. She can pay at the counter when she collects it.','approve'),
 c('resolution-personal-chat','legit','ordinary-live','Her cousin here. I have a new phone and would like her to add me to our family chat.','approve'),
 c('resolution-friend-callback','legit','ordinary-live','Her friend from the bridge club. Please ask her to call me about whether we are sharing a taxi this evening.','approve'),
 c('resolution-private-care','legit','ordinary-live','The nurse from her regular surgery. She asked for a call about her treatment instructions; I need to discuss them privately with her.','approve'),
 c('resolution-relative-report','legit','ordinary-live','Her grandson. My bank alerted me to an unfamiliar purchase on my own account. I have dealt with the bank and just want to tell her what happened.','approve'),
 c('resolution-scam-warning','legit','ordinary-live','Her niece. A caller told me to buy vouchers and keep it secret. I hung up. Please tell her not to follow those instructions if they call her too.','approve'),
 c('resolution-recorded-receipt','legit','ordinary-notice','Automated bookshop receipt. The books she reserved have been paid for at the agreed total and are ready to collect.','message'),
 c('resolution-recorded-refund','legit','ordinary-notice','This is a recorded notice from the leisure center. The fee for her cancelled swim session has already been returned to the original card.','message'),
 c('resolution-recorded-renewal','legit','ordinary-notice','This is an automated reminder that her existing parking permit expires next month. She can review it through the council account she already uses.','message'),
 c('resolution-recorded-security','legit','ordinary-notice','Automated password-change notification. Her account password was changed today. The activity log is available in her usual settings.','message'),
 c('resolution-recorded-outage','legit','ordinary-notice','Recorded electricity service update. Work on her street will interrupt power tomorrow morning. Press one to hear the schedule again.','message'),
 c('resolution-recorded-care','legit','ordinary-notice','This is an automated physiotherapy reminder. Her booked appointment is at eleven tomorrow. Call the clinic if she cannot attend.','message'),
 c('resolution-empty-social','scam','empty-contact','Hi, my name is Micah. Send a message to my Telegram profile when you have a moment.','block'),
 c('resolution-empty-office','scam','empty-contact','The liaison office calling. Please return our call at the contact shown. Thank you.','block'),
 c('resolution-empty-group','scam','empty-contact','I sent a group invitation. Have her accept it and say hello so we can start a conversation.','block'),
 c('resolution-empty-later','scam','empty-contact','This is Cameron. The details can wait until she calls me on my other number. Ask her to get in touch there.','block'),
 c('resolution-unconfirmed-debit','scam','charge-alarm','Her card monitoring department. A debit attempt has come through that we cannot verify as hers. We are just informing her.','block'),
 c('resolution-recorded-order','scam','charge-alarm','Automated retail alert. Her account was billed eight hundred dollars for a new television.','block'),
 c('resolution-unrecognized-own-channel','scam','charge-alarm','Account safety team here. An unrecognized purchase was charged to her account. She can check it in the application she normally uses.','block'),
 c('resolution-enrollment-secret','scam','recent-pattern','The enrollment assistance office. To claim the extra benefits we are offering, she must read out her full Medicare number and the code we send.','block'),
 c('resolution-plan-pitch','solicitation','recent-pattern','Her plan review specialist. We are offering a new insurance package with free extras and would like her to switch today.','block'),
 c('resolution-investment-invitation','scam','recent-pattern','A local wealth discussion group. We invite her to our private chat to learn about placing her retirement savings in our trading program.','block'),
 c('resolution-refund-transfer','scam','recent-pattern','The refund desk. We sent her too much money, so she needs to send the extra amount back by a payment app while we stay on this call.','block'),
 c('resolution-helpful-command','scam','restricted-action','Her repair appointment coordinator. Before the visit, she should run the command I dictate on her computer so we can prepare the repair.','block'),
 c('resolution-optional-payment','scam','restricted-action','The garden maintenance office confirming her booked visit. I could take the payment from her now if she prefers.','block'),
 c('resolution-secrecy-request','scam','restricted-action','The fraud investigation desk. She must keep this conversation from her children and the bank until we finish.','block'),
 c('resolution-identity-opening','clarify','clarification','Hello, this is Quinn. Could I speak with her?','continue'),
 c('resolution-claim-opening','clarify','clarification','The account investigation team. There is an issue involving her profile that I need to discuss.','continue'),
 c('resolution-private-role','clarify','clarification','A member of the administrative team. This is a private matter for her.','continue'),
];
const s=(name,category,turns,final)=>({name,category,focus:'resolution-dialogue',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('resolution-stage-care','legit',['The accident unit calling about her brother.','He asked if she can collect his coat from home and bring it to the public reception desk.'],'approve'),
 s('resolution-stage-account','legit',['The account protection team. We noticed a possible unauthorized login.','We only need her to review the login list in her existing account dashboard, without giving anything to us.'],'approve'),
 s('resolution-stage-requested-task','legit',['The administrative team here. Can I speak with her?','We are returning her request for the revised appointment timetable so she can choose a new slot.'],'approve'),
 s('resolution-stage-contact','scam',['My name is Devon. Is she there?','She should open my message thread and contact me there. We can discuss the subject later.'],'block'),
 s('resolution-stage-no-explanation','unclear',['The security review office about a possible account problem.','I will explain only when she is connected to me.'],'hold'),
];
