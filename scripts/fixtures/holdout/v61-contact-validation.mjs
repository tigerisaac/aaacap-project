// Fresh synthetic validation, authored after the v61/v57 requests were frozen.
// No public transcripts or benchmark rows. Author-designed, not independently blinded.
const item=(name,category,focus,text,accept)=>({name,category,focus,turns:[text],accept:accept??[category==='legit'?'approve':category==='scam'?'block':'continue']});
export const cases=[
 item('validation-empty-reply','scam','empty-contact','Reply to this number when you hear this. I will explain in the messages.'),
 item('validation-empty-add','scam','empty-contact','Please connect with my account on the messaging service. That is the whole message.'),
 item('validation-empty-name','scam','empty-contact','My name is Cora. Have her phone me later.'),
 item('validation-empty-familiar','scam','empty-contact','She will understand once she sees my profile. Ask her to add it and reach out.'),
 item('validation-empty-business','scam','empty-contact','This is the liaison department. She needs to contact our representative for details.'),
 item('validation-empty-signal','scam','empty-contact','I cannot stay on this line. She should send me a message instead.'),
 item('validation-empty-invitation','scam','empty-contact','Have her open my page and start a private chat so I can explain an opportunity.'),
 item('validation-empty-spanish','scam','empty-contact','Llámame a este número cuando puedas. Te explicaré después.'),
 item('validation-personal-cousin','legit','ordinary-callback','Her cousin speaking. My old phone broke, so have her save this contact and ring me.'),
 item('validation-personal-teammate','legit','ordinary-callback','I play on her bowling team. Ask her to message me about our practice.'),
 item('validation-personal-private','legit','ordinary-callback','Her close friend here. Something personal is on my mind; can she call me when she has a moment?'),
 item('validation-personal-relative','legit','ordinary-callback','Her nephew here. I would like to hear how she is doing. I can talk now or she can call later.'),
 item('validation-service-order','legit','ordinary-callback','The florist about her bouquet order. We need her choice of a substitute flower; a reply by message is fine.'),
 item('validation-service-health','legit','ordinary-callback','Her dental office returning the question she sent about her appointment. Please call reception; the details are private.'),
 item('validation-service-employment','legit','ordinary-callback','The museum volunteer coordinator. She submitted an application and we are arranging her introductory meeting. She can call to choose a time.'),
 item('validation-service-repair','legit','ordinary-callback','Her bicycle workshop. The repair she requested is finished. Please call to arrange collection.'),
 item('validation-service-class','legit','ordinary-callback','Her language school. The course she enrolled in starts in a different building; our website has the updated room list.'),
 item('validation-service-refund','legit','ordinary-callback','The ferry booking desk. Her canceled sailing has been refunded to the original card. She may call if she needs the receipt.'),
 item('validation-service-quote','legit','ordinary-callback','The roofer responding to her estimate request. Ask her to text a suitable time for the visit.'),
 item('validation-service-delivery','legit','ordinary-callback','Her appliance delivery crew. Message us on WhatsApp about the entrance for the delivery she arranged.'),
 item('validation-account-approval','scam','account-control','I manage her club membership. Accept the account login approval I send so I can verify her place.'),
 item('validation-account-change','scam','account-control','Her mail service help desk. Change the recovery address on her account to mine so I can finish the maintenance.'),
 item('validation-security-disable','scam','account-control','Her service technician here. Turn off account verification codes while we work on her subscription.'),
 item('validation-coercion','scam','payment-threat','The enforcement desk calling. She must send a wire today or officers will detain her.'),
 item('validation-financial-alarm','scam','alarm','Automatic purchase notice. Her card has just been charged for a new television.'),
 item('validation-contact-with-secret','scam','credentials','Her usual repair company here. Call us tomorrow and read out her account password.'),
 item('validation-unclear-name','unclear','useful-clarification','Hello, this is Nia. Could she speak with me?'),
 item('validation-unclear-purpose','unclear','useful-clarification','I am calling to arrange a time. Is she free?'),
 item('validation-unclear-credit','unclear','useful-clarification','The adjustment office here about some money due to her.'),
 item('validation-unclear-official','unclear','useful-clarification','Calling from the county office. May I speak to her?'),
];
const staged=(name,category,focus,turns,final)=>({name,category,focus,staged:true,turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 staged('validation-stage-social','legit','useful-clarification',['This is Asha. Can I speak with her?','We are friends from her book circle. I want to catch up.'],'approve'),
 staged('validation-stage-credit','legit','useful-clarification',['The studio calling about a credit for her.','She canceled a pottery workshop. The refund is complete, and this is just a confirmation.'],'approve'),
 staged('validation-stage-government','legit','useful-clarification',['The borough office. I would like to speak with her.','She asked for help replacing a damaged waste container. We need to schedule drop-off.'],'approve'),
 staged('validation-stage-empty','scam','empty-contact-followup',['I am Morgan. Is she available?','No, I will not give a reason. Tell her to message my account later.'],'block'),
 staged('validation-stage-harm','scam','useful-clarification',['The studio calling about a credit for her.','To release the money, read me the full card number and security code.'],'block'),
 staged('validation-stage-refusal','unclear','question-budget',['I am Morgan. Is she available?','I will not explain why I am calling. Put her on.'],'hold'),
];
