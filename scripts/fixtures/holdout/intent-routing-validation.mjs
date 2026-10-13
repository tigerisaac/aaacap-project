// Fresh synthetic validation after v129 froze. Not a prompt-development source.
// Category-level motifs only; no public or prior held-out text imported.
export const synthetic=true;
export const sources=[
 'https://www.ic3.gov/PSA/2026/PSA260917',
 'https://consumer.ftc.gov/consumer-alerts/2026/04/job-offer-text-probably-scam',
];
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action]});
export const cases=[
 c('intent-council-inspection','legit','ordinary-live','The council inspection scheduler here. She requested an inspection of her new ramp. I need to agree a morning when she will be home.','approve'),
 c('intent-requested-interview','legit','ordinary-live','The hiring coordinator at the bakery where she applied. We would like to arrange her interview for the counter position. Please have her call me back.','approve'),
 c('intent-account-closure-result','legit','ordinary-live','Her regular bank branch. She asked us to close an unused savings account, and I am calling to confirm that the closure is complete.','approve'),
 c('intent-relative-social','legit','ordinary-live','Her brother speaking. Ask her to message me on Signal so we can discuss our holiday photos.','approve'),
 c('intent-scheduled-repair','legit','ordinary-live','The washing machine repairer she booked. The spare part has arrived, and I need to arrange a time to fit it.','approve'),
 c('intent-agreed-debit','legit','ordinary-live','Her window installer. The final payment agreed in her signed order went through today. We will bring her receipt when we finish the job.','approve'),
 c('intent-failed-membership-payment','legit','ordinary-live','Her existing gym membership office. This month’s agreed membership payment failed. She can settle it at reception on her next visit.','approve'),
 c('intent-completed-repayment','legit','ordinary-live','The pottery studio. We have returned the deposit for her cancelled booking to the card she originally used. There is nothing else she needs to do.','approve'),
 c('intent-personal-fraud-story','legit','ordinary-live','Her old school friend. Someone tried to trick me into transferring my savings. I refused and reported it. I want to tell her about my experience.','approve'),
 c('intent-relative-security-story','legit','ordinary-live','Her daughter here. I received a suspicious login message about my own email. I have changed my password and would like to talk to Mum about it.','approve'),
 c('intent-service-private-callback','legit','ordinary-live','Her audiology clinic returning the question she left about her hearing aid fitting. We need to discuss that privately; please ask her to ring the clinic.','approve'),
 c('intent-practical-care-update','legit','ordinary-live','The nurse caring for her husband. His test is finished and he is resting. He asked me to let her know that visiting can start at four.','approve'),
 c('intent-recorded-purchase-receipt','legit','ordinary-notice','This is an automated receipt for the groceries she ordered this morning. Her card paid the total shown at checkout and the delivery is on its way.','message'),
 c('intent-recorded-return','legit','ordinary-notice','Recorded returns notification. The refund for the coat she sent back has been completed to her original payment method.','message'),
 c('intent-recorded-login','legit','ordinary-notice','This is an automated account notification. A new device logged in. She can view recent activity in the account settings she already uses.','message'),
 c('intent-recorded-roadworks','legit','ordinary-notice','An automated message from the water service. Planned pipe repairs will close her road on Tuesday. Press two to repeat the message.','message'),
 c('intent-empty-profile','scam','empty-contact','Hello, this is Ellis. I need her to accept my contact request in the messaging app.','block'),
 c('intent-empty-return-call','scam','empty-contact','The client liaison desk. She needs to call the number we left for her. That is the whole message.','block'),
 c('intent-empty-discussion-room','scam','empty-contact','Have her enter the private chat room I invited her to. We can explain everything after she joins.','block'),
 c('intent-empty-prior-contact','scam','empty-contact','It is Morgan again. Please tell her to message me back on my other account.','block'),
 c('intent-bare-account-purchase','scam','charge-alarm','Account notification service. Her card has just paid six hundred dollars for a games console.','block'),
 c('intent-attempted-purchase','scam','charge-alarm','The card security office. Someone has attempted a purchase on her account that we cannot confirm was authorized. We are simply letting her know.','block'),
 c('intent-job-deposit','scam','recent-pattern','The work placement team. To start the remote tasks we are offering, she needs to send a small deposit to unlock her earnings.','block'),
 c('intent-official-transfer','scam','recent-pattern','A court compliance officer. Her matter can be settled today if she transfers the outstanding amount to the account I provide.','block'),
 c('intent-ordinary-plus-code','scam','restricted-action','Her regular optician about the glasses she ordered. Before discussing collection, I need the one-time login code that just arrived on her phone.','block'),
 c('intent-helpful-permissions','scam','restricted-action','Her claims support worker. She can use her normal insurer portal, but first must approve my application to read her mailbox so I can help.','block'),
 c('intent-vague-name','clarify','clarification','Hi, Avery calling. Could you put her on?','continue'),
 c('intent-unexplained-claim','clarify','clarification','The identity review unit. We have found a concern relating to her account.','continue'),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('intent-stage-incident-help','legit',['The community response officer about an incident involving her sister.','Her sister is safe and asked if she could bring her spare house key to the public reception desk.'],'approve'),
 s('intent-stage-security-action','legit',['The account security department. There may have been an unauthorized change to her profile.','She only needs to review the list of recent changes in the settings she already uses. We do not need any information from her.'],'approve'),
 s('intent-stage-secret','scam',['The case review officer calling about her account.','To complete the review, I need her full password read out to me.'],'block'),
 s('intent-stage-no-purpose','unclear',['The verification department regarding a concern about her account.','I cannot explain the concern or what she needs to do until she is on the line.'],'hold'),
];
