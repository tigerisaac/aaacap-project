// Fresh synthetic validation authored after the v74/v57 freeze. Not a blinded population sample.
// No public transcripts or benchmark rows; expected outcomes fixed before inference.
const item=(name,category,focus,text,accept)=>({name,category,focus,turns:[text],accept:accept??[category==='legit'?'approve':category==='scam'?'block':'continue']});
export const cases=[
 item('v74-empty-return','scam','empty-contact','This is Robin. Please return my call.'),
 item('v74-empty-save','scam','empty-contact','Save this number and say hello to me in WhatsApp.'),
 item('v74-empty-immediate','scam','empty-contact','Right now, have her send me a private message. I will tell her the reason there.'),
 item('v74-empty-later','scam','empty-contact','She should get in touch with this number this evening. That is all she needs to know.'),
 item('v74-empty-profile','scam','empty-contact','Invite my profile into her contacts so we can start talking.'),
 item('v74-empty-company','scam','empty-contact','The communications team here. Ask her to phone our desk to learn what this concerns.'),
 item('v74-empty-familiar','scam','empty-contact','She knows what this is. Tell her to message the caller back.'),
 item('v74-empty-spanish','scam','empty-contact','Hola, soy Mateo. Pídele que me llame. Eso es todo.'),
 item('v74-ordinary-daughter','legit','ordinary-callback','Her daughter speaking. I have a new contact number. Ask her to save it and call me.'),
 item('v74-ordinary-friend','legit','ordinary-callback','Her friend from the walking club. I would like to chat; she can message my new account whenever she is free.'),
 item('v74-ordinary-neighbor','legit','ordinary-callback','Her downstairs neighbor. Please ask her to ring me about watering the plants while I am away.'),
 item('v74-ordinary-private','legit','ordinary-callback','Her brother here. Could she call me when she has some privacy? It is a family matter.'),
 item('v74-ordinary-medical','legit','ordinary-callback','Her eye clinic returning her request to discuss the examination. Please call reception when convenient; we can discuss the details privately.'),
 item('v74-ordinary-hiring','legit','ordinary-callback','The theatre manager about the usher position she applied for. Can she call to arrange an interview?'),
 item('v74-ordinary-quote','legit','ordinary-callback','The fence installer responding to her request for an estimate. Message me to arrange a visit.'),
 item('v74-ordinary-delivery','legit','ordinary-callback','Her meal delivery driver. The order is here; send me a chat message about where to leave it.'),
 item('v74-ordinary-pickup','legit','ordinary-callback','Her watch repair shop. The watch she brought in is ready. Phone the counter to arrange pickup.'),
 item('v74-ordinary-refund','legit','ordinary-callback','Her hotel booking office. The refund she requested has been completed to the original card. Call if she has a question.'),
 item('v74-ordinary-receipt','legit','ordinary-notice','Automatic notice from her music school: the lesson payment she arranged has been received. No response is needed.'),
 item('v74-ordinary-security','legit','ordinary-notice','Her account notification service. She can review security later using her existing app; this call needs no reply or interaction.'),
 item('v74-harm-login','scam','account-control','Her conference coordinator. Accept the login approval I trigger on her account so I can register her attendance.'),
 item('v74-harm-settings','scam','account-control','Her account support team. Change the recovery contact to my address, then disable sign-in verification until our repair is complete.'),
 item('v74-harm-charge','scam','alarm','An automated purchase announcement: a new tablet computer has been charged to her payment card.'),
 item('v74-harm-money','scam','payment','Her usual service office. She needs to send the agreed payment to my payment app while we stay on the phone.'),
 item('v74-open-name','unclear','useful-clarification','Hello, my name is Rowan. Could I speak with her?'),
 item('v74-open-office','unclear','useful-clarification','Calling from the city department. Is she available?'),
 item('v74-open-money','unclear','useful-clarification','I am with the reimbursement office. I want to talk about money for her.'),
 item('v74-open-task','unclear','useful-clarification','I would like to speak about a delivery. Is she there?'),
];
const staged=(name,category,focus,turns,final)=>({name,category,focus,staged:true,turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 staged('v74-stage-personal','legit','useful-clarification',['Hello, I am Sage. May I speak to her?','I am her friend from the choir. I wanted to see how she is doing.'],'approve'),
 staged('v74-stage-service','legit','useful-clarification',['The community center here about a credit for her.','The dance class she paid for was canceled. Her refund is complete; nothing is required from her.'],'approve'),
 staged('v74-stage-empty','scam','empty-contact-followup',['Hello, I am Sage. May I speak to her?','I am not giving a reason. Just have her contact my messaging account.'],'block'),
 staged('v74-stage-harm','scam','useful-clarification',['The community center here about a credit for her.','Have her read out her full card number and security code to receive the money.'],'block'),
 staged('v74-stage-refusal','unclear','question-budget',['Hello, I am Sage. May I speak to her?','I will not explain who I am to her or what I want. Let me speak with her.'],'hold'),
];
