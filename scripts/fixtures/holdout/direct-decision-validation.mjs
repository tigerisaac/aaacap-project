// Fresh synthetic validation after v141 freeze. General mechanisms only;
// no public scripts, labels or prepared replies are supplied to the model.
// These cases must not guide subsequent prompt wording.
export const synthetic=true;
export const sources=['https://www.ic3.gov/PSA/2026/PSA260917','https://www.reddit.com/r/Scams/comments/1u7l9e4/our_business_keeps_getting_spam_phone_calls_from/'];
const c=(name,category,text,action,caution=false)=>({name,category,focus:'direct-decision',turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('directcheck-person-contact','scam','It’s Elliot. Shoot me a message over on the chat app tonight.','block'),
 c('directcheck-office-invitation','scam','The outreach desk here—would she join our private channel? We can talk once she’s in.','block'),
 c('directcheck-bare-return','scam','Please return this call and ask for Cameron.','block'),
 c('directcheck-family-return','legit','It’s her grandson. Can she ring me when she’s finished eating?','approve'),
 c('directcheck-shared-activity','legit','We sing together on Wednesdays. I’m calling to see if she can bring the music folder.','approve'),
 c('directcheck-job-callback','legit','I’m the decorator booked for her hallway. Can she text me which paint finish she chose?','approve'),
 c('directcheck-collection','legit','The housing office. Her replacement entry fob is ready at reception.','approve'),
 c('directcheck-care-update','legit','Her audiology clinic. We need to move the appointment she booked to a different day.','approve'),
 c('directcheck-receipt','legit','This automated notice is from her language school. The payment for the lessons she selected has arrived.','message'),
 c('directcheck-refund-notice','legit','This is a recorded update from the rail ticket office. We processed the refund form she sent for the canceled journey. The money has been returned.','message'),
 c('directcheck-authorization','scam','Payment center here. There’s another online order on her card. We need to know whether she authorized it.','block'),
 c('directcheck-charge','scam','The account desk calling about a debit she would not recognize.','block'),
 c('directcheck-expected-failure','legit','The choir treasurer. Her standing payment for the rehearsal fees was returned. She can check it in the account she normally uses.','approve'),
 c('directcheck-personal-report','legit','Her next-door neighbor. My mother got a call telling her to hand cash to a driver. I’m worried and want to warn her not to do that.','approve'),
 c('directcheck-concealment','scam','The case investigator. She must not discuss our conversation with her bank or relatives; that would interfere with the investigation.','block'),
 c('directcheck-official-appointment','legit','The registration office about the visit she arranged. She needs to bring the original documents to the appointment, that’s all.','approve'),
 c('directcheck-installation','scam','Browser assistance calling. Her connection needs a patch. Have her download our installer and run it while we wait.','block'),
 c('directcheck-listing-pitch','ad','The business discovery team. We can improve how her shop appears in voice searches and want to sign her up for our listing package.','block'),
 c('directcheck-text-response','legit','The pharmacy replying to the text she sent about her refill. It will be ready this afternoon.','approve',true),
 c('directcheck-caution-return','legit','Her brother returning the call she made this morning. I wanted to talk about our lunch plans.','hold',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'direct-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('directcheck-stage-purpose','legit',['Hi, Sasha speaking. Is she there?','I’m delivering the groceries she ordered and need to know which entrance to use.'],'approve'),
 s('directcheck-stage-refund','legit',['The accounts office. There’s money coming back to her.','It’s the duplicate membership payment she asked us to reverse. We’ve finished that and are just letting her know.'],'approve'),
 s('directcheck-stage-identifier','scam',['The security desk about an account issue.','Have her read out the full number on her government identity document to get this resolved.'],'block'),
 s('directcheck-stage-refusal','unclear',['The licensing office about a matter involving her.','I won’t tell you what we need her to do until she comes on the line.'],'hold'),
];
