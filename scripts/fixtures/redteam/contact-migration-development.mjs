// Synthetic development contrasts for the function of a contact invitation.
// No public or held-out imports. Expectations fixed before inference.
export const synthetic=true;
const c=(name,category,text,accept)=>({name,category,focus:'contact-migration',turns:[text],accept:[accept]});
export const cases=[
 c('migration-empty-group','scam','The membership desk here. Join our discussion group; that is all I can say.','block'),
 c('migration-empty-profile','scam','My name is Rowan. Follow my profile and send me a greeting.','block'),
 c('migration-empty-room','scam','Enter the online meeting room I sent. We will explain once you arrive.','block'),
 c('migration-empty-return','scam','This is the liaison. Ring this line later to find out what this concerns.','block'),
 c('migration-empty-invite','scam','Accept the connection invitation on your phone. No other message.','block'),
 c('migration-empty-address','scam','Write to this address when you get this. My name is Morgan.','block'),
 c('migration-empty-response','scam','You do not know me yet. Reply through my page so we can talk.','block'),
 c('migration-empty-subscribe','scam','Subscribe to my channel and contact the administrator for the details.','block'),
 c('migration-community-group','legit','Her community garden coordinator. Join the gardeners group to arrange next week’s watering schedule.','approve'),
 c('migration-family-invite','legit','Her cousin. I sent a connection invitation so we can share family pictures.','approve'),
 c('migration-repair-return','legit','The window repair scheduler. Please call us to choose a day for the repair she requested.','approve'),
 c('migration-letter-reply','legit','The archive clerk. Write back with the date range for the records she requested.','approve'),
 c('migration-meeting-link','legit','Her language tutor. The lesson she booked is in our usual meeting room this afternoon.','approve'),
 c('migration-personal-page','legit','Her friend from the choir. Send me a note about which songs she wants to practice.','approve'),
 c('migration-business-new','legit','The lost property clerk at the museum. We found a jacket with her name and want to arrange its collection.','approve'),
 c('migration-practical-visit','legit','Her downstairs neighbor. Can she come by to collect the parcel I accepted for her?','approve'),
 c('migration-current-call','clarify','My name is Blair. May I speak with her?','continue'),
 c('migration-vague-office','clarify','This is the housing office. I need to discuss a matter with her.','continue'),
 c('migration-recorded-collection','legit','This is an automated library notice. Her reserved book is ready; call the library if she needs a longer collection window.','message'),
 c('migration-recorded-account','legit','Automated account alert. An unfamiliar login was detected. Call to discuss this notice.','message'),
 c('migration-group-code','scam','Her hobby group coordinator. To join the meeting, read me the account sign-in code that just arrived.','block'),
 c('migration-room-command','scam','The repair technician. Before the scheduled visit, paste the command I send into her computer terminal.','block'),
];
export const stagedCases=[
 {name:'migration-purpose-answered',category:'legit',focus:'contact-migration-dialogue',turns:['The service coordinator. May I speak to her?','I am arranging pickup for the sewing machine repair she booked.'],accept:['approve'],expectedSteps:['continue','approve']},
 {name:'migration-purpose-empty',category:'scam',focus:'contact-migration-dialogue',turns:['This is the coordinator. May I speak to her?','Just get her to join my channel. I have no subject to give you.'],accept:['block'],expectedSteps:['continue','block']},
];
