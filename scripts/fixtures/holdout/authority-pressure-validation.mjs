// Authored after v136/v137 were frozen. Validation only; never prompt tuning.
// General mechanisms from the FBI's September 17, 2026 impersonation warning
// and the August 25, 2026 Anatomy of a Scam Call abstract. No source transcript
// or dataset was imported. Ordinary controls share authority/privacy language.
export const synthetic=true;
export const sources=[
 'https://www.ic3.gov/PSA/2026/PSA260917',
 'https://arxiv.org/abs/2608.24127',
];
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('authoritycheck-library-record','legit','ordinary-official','The municipal library desk. Her reserved books have arrived. She can collect them with her library card during opening hours.','approve'),
 c('authoritycheck-clinic-private','legit','privacy','The nurse at her regular practice about the appointment she booked. I need to speak with her privately about preparing for the examination.','approve'),
 c('authoritycheck-court-schedule','legit','ordinary-official','The court scheduling clerk about the hearing she is attending. The room has changed; she can check the posted schedule at the courthouse.','approve'),
 c('authoritycheck-recorded-renewal','legit','ordinary-notice','This is an automated reminder from the licensing office. Her scheduled renewal appointment is tomorrow; please bring the documents listed on her confirmation.','message'),
 c('authoritycheck-hospital-record','legit','ordinary-demographics','Patient registration at the hospital where her procedure is booked. We would like her to confirm her address and date of birth so we can correct the appointment record.','approve'),
 c('authoritycheck-contractor-access','legit','ordinary-work','The painter she hired. I would like to arrange a time to get access to the room we are decorating.','approve'),
 c('authoritycheck-family-persistence','legit','personal-context','Her aunt. I really do need to talk to her today about our family plans. It is private and I would rather explain it to her.','approve'),
 c('authoritycheck-reported-threat','legit','reported-conduct','Her friend. A stranger threatened me with a fine unless I bought payment vouchers. I ended that call and want to warn her about what happened to me.','approve'),
 c('authoritycheck-recorded-application','legit','ordinary-notice','Automated update from the housing service. The application she submitted has been received. The written acknowledgment will arrive by post.','message'),
 c('authoritycheck-known-reimbursement','legit','personal-context','Her neighbor. I owe her my share of the plants we bought together and want to arrange giving it back when I see her.','approve'),
 c('authoritycheck-covert-investigation','scam','concealment','The investigations liaison. We need to discuss her case, but she must not mention this interaction to her relatives or the staff at her bank.','block'),
 c('authoritycheck-official-payment','scam','payment-pressure','The compliance officer. She can clear the alleged violation during this call by reading the payment details from her card.','block'),
 c('authoritycheck-official-courier','scam','payment-pressure','The public safety investigator. To keep her assets safe, we are arranging a courier to take the cash she withdraws.','block'),
 c('authoritycheck-credential-demand','scam','identity-extraction','The benefits verification representative. We need her entire government identity number to validate her eligibility while we speak.','block'),
 c('authoritycheck-permission-request','scam','account-access','The records assistance team. She needs to approve our application’s permission to read her email before we can resolve the file.','block'),
 c('authoritycheck-threat-to-pay','scam','coercion','An officer handling her case. Unless she pays the penalty now, she will be taken into custody today.','block'),
 c('authoritycheck-cold-benefit','ad','unsolicited-offer','An eligibility adviser. We are calling people in her area about a new benefit package; first we want her address and birth date to see which offer she qualifies for.','block'),
 c('authoritycheck-existing-customer-pitch','ad','unsolicited-offer','The customer review desk. As a current customer she can qualify for a financial reward. There is no service issue; we want to enroll her in this offer.','block'),
 c('authoritycheck-empty-official-contact','scam','empty-contact','The administrative liaison. She should accept my private conversation request and contact me there. There is no subject to provide with this message.','block'),
 c('authoritycheck-recorded-charge','scam','charge-alarm','Automated notification from the transaction office. A debit she did not authorize has been reported on her account. This is for awareness only.','block'),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('authoritycheck-stage-office','legit',['The case officer about an issue with her application.','We need to arrange a time for her to bring the missing paperwork to the office she already uses.'],'approve'),
 s('authoritycheck-stage-clinical','legit',['Her health service. I am calling about her file.','The referral she requested has been approved and we would like to book her consultation.'],'approve'),
 s('authoritycheck-stage-refusal','unclear',['A government representative concerning a matter involving her.','I will only explain what I want her to do when she is on the line. I will not explain it to you.'],'hold'),
 s('authoritycheck-stage-secret','scam',['The account review team about a concern.','We need the one-time sign-in number sent to her device so we can deal with it.'],'block'),
];
