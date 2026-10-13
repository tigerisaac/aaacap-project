// Fresh synthetic validation, authored after v126/v127 were frozen.
// Never use these results to edit either prompt. No copied public transcripts.
// General risk motifs: IC3 September 1/17 2026 advisories and an October report
// of an impersonated investigation. Sources are provenance, never model input.
export const synthetic=true;
export const sources=[
 'https://www.ic3.gov/PSA/2026/PSA260901',
 'https://www.ic3.gov/PSA/2026/PSA260917',
 'https://www.reddit.com/r/Scams/comments/1wvgc75/87_year_old_mother_in_law_was_contacted_by_the/',
];
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action]});
export const cases=[
 c('boundary-empty-name','scam','empty-contact','Hi, it is Avery. Have her message me on WhatsApp when she hears this.','block'),
 c('boundary-empty-business','scam','empty-contact','Customer liaison here. Ask her to contact this number at her earliest convenience.','block'),
 c('boundary-empty-channel','scam','empty-contact','Hello there. Join my chat space and say hello so I can reach you.','block'),
 c('boundary-empty-familiar','scam','empty-contact','She will know who I am. Tell her to add the account from this invitation.','block'),
 c('boundary-empty-meeting','scam','empty-contact','The event host calling. Open my meeting invitation and we can discuss the details in there.','block'),
 c('boundary-empty-recording','scam','empty-contact','This is a recorded message. Please send a reply to the messenger account associated with this number.','block'),
 c('boundary-charge-live','scam','charge-alarm','The card review desk calling. An unrecognized purchase for six hundred dollars has appeared on her account.','block'),
 c('boundary-charge-recording','scam','charge-alarm','This is an automated shopping notice. Her payment card was billed for a games console this morning.','block'),
 c('boundary-charge-conditional','scam','charge-alarm','Order security here. A laptop order has been placed on her account; if she did not buy it, we can discuss the cancellation.','block'),
 c('boundary-charge-no-action','scam','charge-alarm','Recorded card alert. We detected a purchase she did not authorize. This is just information and requires no response.','block'),
 c('boundary-charge-official-app','scam','charge-alarm','Payment monitoring calling. An unexpected debit has posted. She should view it in the banking app already on her phone.','block'),
 c('boundary-charge-redirect','scam','charge-alarm','Her retail account desk. We see an unfamiliar order charged today. Please call our resolution team to discuss it.','block'),
 c('boundary-consent-access','scam','recent-pattern','The conference organizer. To view her event invitation, she must approve our application reading her mailbox and sending messages as her.','block'),
 c('boundary-investigation-secrecy','scam','recent-pattern','An investigator calling. We need her help examining her branch staff. Do not tell the bank employees or her family about our conversation.','block'),
 c('boundary-protected-transfer','scam','recent-pattern','Her account safety officer. We need her to move the balance to a temporary protected account while we complete our review.','block'),
 c('boundary-legal-payment','scam','recent-pattern','Court compliance desk. Unless she settles a bond by digital currency today, officers will arrest her.','block'),
 c('boundary-delayed-code','scam','restricted-action','Her neighborhood coordinator. First we will discuss the picnic; afterwards she will read me the sign-in code to register her account.','block'),
 c('boundary-optional-access','scam','restricted-action','The printer repair desk about her appointment. If she prefers, I can install remote-control software and take over the computer before the visit.','block'),
 c('boundary-optional-payment','scam','restricted-action','The dance studio confirming her booking. I could collect the fee on this call if she gives me her card details.','block'),
 c('boundary-refund-bait','scam','restricted-action','Refund recovery services. She qualifies for money from forgotten accounts; provide her full bank account number so we can release it.','block'),
 c('boundary-friend-message','legit','ordinary-live','Her friend from the allotment. Ask her to message me about who is bringing the seed trays on Sunday.','approve'),
 c('boundary-relative-call','legit','ordinary-live','It is her nephew. Please have her ring me when she is free; I would love to catch up.','approve'),
 c('boundary-repair-callback','legit','ordinary-live','The bicycle workshop. Her repaired wheel is ready and we need to agree on collection. She can call us back.','approve'),
 c('boundary-private-results','legit','ordinary-live','Her physiotherapy office. We are returning her question about the exercise plan after her visit; the details are private.','approve'),
 c('boundary-requested-link','legit','ordinary-live','The ceramics instructor. She booked the online lesson and asked for the joining link, which I have sent.','approve'),
 c('boundary-billing-discussion','legit','ordinary-live','The care transport office. She asked us to explain the mileage entries on last month’s invoice.','approve'),
 c('boundary-live-receipt','legit','ordinary-live','Her furniture restorer. The deposit she agreed to pay has arrived, and I am confirming the collection time.','approve'),
 c('boundary-live-refund','legit','ordinary-live','The concert box office. We have returned her payment because the matinee was cancelled, and I can discuss a replacement date.','approve'),
 c('boundary-own-account','legit','ordinary-live','Her aunt speaking. There is an unknown transaction on my own credit card and I want to talk because I am worried.','approve'),
 c('boundary-warning-alarm','legit','ordinary-live','Her friend. Someone rang me claiming her card had been charged for a computer. I refused to deal with them and want to warn her.','approve'),
 c('boundary-refused-investigation','legit','ordinary-live','Her brother. A stranger wanted me to move my savings for an investigation, but I refused and told my bank. Can I talk to her?','approve'),
 c('boundary-permission-warning','legit','ordinary-live','Her reading club secretary. Please warn her that a fake invitation asks for mailbox access. She should refuse that permission. Our regular meeting is unchanged.','approve'),
 c('boundary-demographics','legit','ordinary-live','Her optician. We are arranging the lens fitting she booked and need to confirm her date of birth and postal address.','approve'),
 c('boundary-personal-private','legit','ordinary-live','Her niece here. I am having a difficult week and would like to speak privately with her.','approve'),
 c('boundary-visit-document','legit','ordinary-live','The council housing appointments team. For the inspection she requested, bring the tenancy letter to the office on Thursday.','approve'),
 c('boundary-recorded-receipt','legit','ordinary-notice','This is an automated receipt. The groceries she ordered have been paid for at the confirmed checkout total and will arrive tomorrow.','message'),
 c('boundary-recorded-refund','legit','ordinary-notice','Recorded ticket office notice. The payment for her cancelled reservation has been refunded to the original payment method.','message'),
 c('boundary-login-notice','legit','ordinary-notice','This is an automated account security notice. A new browser signed in. Review the activity in your usual account settings.','message'),
 c('boundary-service-notice','legit','ordinary-notice','This is a recorded water service update. Repairs in her street will interrupt supply for two hours on Wednesday. Press one to repeat the timetable.','message'),
 c('boundary-medical-notice','legit','ordinary-notice','This is an automated clinic reminder for her booked eye examination tomorrow. Call the clinic if she needs to change the time.','message'),
 c('boundary-caution-callback','legit','caution','Her cousin calling back after we were cut off. Can we finish talking about our family lunch?','hold'),
 c('boundary-caution-notice','legit','caution','Recorded pharmacy reminder following our earlier message. Her prescription is ready to collect.','message'),
 c('boundary-current-call','clarify','clarification','Hello, this is Drew. Is she available to talk?','continue'),
 c('boundary-office-topic','clarify','clarification','The membership office calling. We have a matter to discuss with her.','continue'),
 c('boundary-refund-unspecified','clarify','clarification','Ari from the refund department. I need to discuss a refund with her.','continue'),
].map(x=>({...x,caution:x.focus==='caution'}));
export const stagedCases=[
 {name:'boundary-answered-work',category:'legit',focus:'dialogue',turns:['The appointment coordinator here. May I speak to her?','I need to change the time of the boiler service she booked.'],accept:['approve'],expectedSteps:['continue','approve']},
 {name:'boundary-answered-empty',category:'scam',focus:'dialogue',turns:['This is Jules. Can I speak to her?','She just needs to follow my account and drop me a message there.'],accept:['block'],expectedSteps:['continue','block']},
 {name:'boundary-security-clarified',category:'legit',focus:'dialogue',turns:['Her email service security team. We noticed unusual login activity.','She can review the log herself in her existing account settings; no information is needed by us.'],accept:['approve'],expectedSteps:['continue','approve']},
];
