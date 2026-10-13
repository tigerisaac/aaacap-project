// Fresh synthetic validation authored after v142 freeze. No public caller text.
// Outcomes are assessment only and must not feed later prompt wording.
export const synthetic=true;
const c=(name,category,text,action,caution=false)=>({name,category,focus:'direct-priority',turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('guardcheck-number','scam','Save this number and send a reply when you have a moment.','block'),
 c('guardcheck-name','scam','Alana speaking. Could she give me a call later?','block'),
 c('guardcheck-title','scam','Customer liaison calling. Get her to reply to me on the messaging app.','block'),
 c('guardcheck-neighbor','legit','Alana, her upstairs neighbor. Could she call me about the water coming through my ceiling?','approve'),
 c('guardcheck-shared-work','legit','We both volunteer at the animal shelter. I’m checking whether she can swap our Saturday shifts.','approve'),
 c('guardcheck-relative','legit','It’s her niece. Today has been awful and I just want to talk to her alone for a bit.','approve'),
 c('guardcheck-certificate','legit','The course administrator. Her certificate is ready for collection from the office.','approve'),
 c('guardcheck-completed-refund','legit','The tyre fitters here. We returned the deposit for the fitting she canceled. It went to the card she originally used.','approve'),
 c('guardcheck-recorded-receipt','legit','This is an automated receipt from the swimming club. We received the membership fee she sent. Press a key if you want to hear it again.','message'),
 c('guardcheck-recorded-appointment','legit','Automated call from her regular dentist. The appointment she requested has been booked for Tuesday afternoon.','message'),
 c('guardcheck-informative-alert','scam','The card alert team. An unknown debit is showing on her account. I’m only giving her the information.','block'),
 c('guardcheck-order-check','scam','The shopping account department. Her account has just ordered a tablet. Did she authorize that purchase?','block'),
 c('guardcheck-personal-money','legit','Her friend speaking. Someone told me my savings were in danger. I hung up, and I want to tell her about it.','approve'),
 c('guardcheck-optional-payment','scam','The school office about the term schedule. If she wants, she can pay the outstanding fee by giving me her card details on this call.','block'),
 c('guardcheck-official-documents','legit','The clerk for the hearing she arranged. The appointment letter lists the documents she should bring to our office.','approve'),
 c('guardcheck-established-security','legit','The account help team. We’re asking her to review recent sign-ins using the settings in the app she already has, whenever convenient.','approve'),
 c('guardcheck-listing-service','ad','Local listings here. We want to sell her a new service that gets her business featured in spoken search results.','block'),
 c('guardcheck-concealed-payment','scam','The licensing inspector. She needs to pay our courier to avoid suspension and must keep this from her adviser.','block'),
 c('guardcheck-caution-notice','legit','This automated callback confirms that the parcel collection she requested is booked.','message',true),
 c('guardcheck-caution-relative','legit','Her cousin returning the call that got cut off earlier. We were talking about dinner.','hold',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'direct-priority-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('guardcheck-stage-work','legit',['Jody here, trying to get hold of her.','I’m the caretaker. We fixed the broken stairwell light, and I want to let her know she can use that entrance again.'],'approve'),
 s('guardcheck-stage-payment','scam',['The administration team about a payout.','She has to give us the full bank card number before we can release anything.'],'block'),
 s('guardcheck-stage-context','legit',['The accounts team about a refund. Could she call us back?','We have finished the return she requested for the canceled reservation. We only need to let her know the credit is complete.'],'approve'),
 s('guardcheck-stage-withheld','unclear',['The duty official about a concern involving her nephew.','I won’t give the purpose or tell you what she must do. I need her on the line first.'],'hold'),
];
