// New speech authored after v151 freeze, following review of NCSC's messaging
// account guidance and September 15 spyware warning. No source text is copied.
export const synthetic=true;
const c=(name,category,text,action)=>({name,category,focus:'messaging-control-validation',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('messagingcheck-link-device','scam','Her cousin calling. To restore our messages, she should scan my square code in the linked-device section of her chat app and pair my computer with her account.','block'),
 c('messagingcheck-install-viewer','scam','The medical results desk. She needs to install the special viewer we are sending before she can see the scan results.','block'),
 c('messagingcheck-remove-access','legit','Her nephew returning her request for help. I will guide her through removing the unfamiliar linked device in her own messaging settings. I will not access her account.','approve'),
 c('messagingcheck-ordinary-poster','legit','Her gardening club organiser. The square code on the poster opens the timetable for the plant exchange she signed up for. I want to discuss which session she prefers.','approve'),
 c('messagingcheck-warning-report','legit','Her walking friend. Someone tried to get me to link their computer to my messages. I refused and want to tell her what happened.','approve'),
 c('messagingcheck-official-transfer','scam','The overseas document authority. Unless she wires the penalty to our agent now, we will cancel her travel document.','block'),
 c('messagingcheck-official-visit','legit','The consular appointment office. Her booked document appointment is moving to a different counter. She should bring the original documents listed in her existing appointment letter.','approve'),
 c('messagingcheck-job-invitation','ad','We are selecting new people for paid online tasks. Ask her to join our private chat channel to learn how to earn.','block'),
 c('messagingcheck-application-followup','legit','The hiring coordinator responding to her application for our reception vacancy. I want to arrange the interview she requested.','approve'),
 c('messagingcheck-recorded-callback','legit','An automated message from her dental practice. The appointment she booked must be moved. Please use the practice number she already has to arrange another time.','message'),
 c('messagingcheck-empty-invite','scam','Tell her to start a chat with me on another service. There is no other reason for my call.','block'),
 c('messagingcheck-recorded-offer','ad','This is a recorded invitation to switch to our discounted household cover. Press the option to speak about buying it, or select the other option to stop these invitations.','block'),
];
