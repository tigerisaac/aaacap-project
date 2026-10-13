// Independent validation written after v147 freeze. Do not tune on its results.
export const synthetic=true;
const c=(name,category,text,action,caution=false)=>({name,category,focus:'financial-purpose-validation',turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('financialcheck-service-statement','legit','Her piano tuner. The statement for the tuning she booked is now available through the account she normally uses.','approve'),
 c('financialcheck-credit-finished','legit','The community hall bookings desk. We have put back the deposit for her canceled room hire. I am letting her know that is done.','approve'),
 c('financialcheck-expected-delay','legit','The subscription office for her newspaper. Her regular payment has not arrived yet. She can review it in her existing account when convenient.','approve'),
 c('financialcheck-collection-callback','legit','I restore her picture frames. Please ask her to call to agree when to collect the finished frames.','approve'),
 c('financialcheck-health-information','legit','The rehabilitation clinic. We are confirming her transport has been booked for the session she arranged.','approve'),
 c('financialcheck-relative-own-loss','legit','Her brother here. My wallet was stolen, but I have dealt with it and do not need money. I want to tell her about my day.','approve'),
 c('financialcheck-friend-refused-access','legit','We are friends from choir. A stranger asked to control my computer. I said no, and want to remind her to be careful too.','approve'),
 c('financialcheck-personal-contact','legit','It is her granddaughter. Could she send me a message later? I just want to catch up.','approve'),
 c('financialcheck-bill-recording','legit','This is a recorded notice from her water supplier. The regular statement for her service is ready to view in the usual portal.','message'),
 c('financialcheck-refund-recording','legit','Automated update from the workshop. The refund for the class she canceled has been returned to the original payment method.','message'),
 c('financialcheck-schedule-recording','legit','Recorded timetable update from the community bus. Tomorrow’s route will leave ten minutes earlier. Press two to repeat.','message'),
 c('financialcheck-charge-separate','scam','The appliance service company. Her booked repair is complete. There is also an unexplained purchase on her card that needs her attention.','block'),
 c('financialcheck-invoice-and-secret','scam','The usual maintenance invoice is ready. To receive it she should read out the sign-in code being sent to her phone.','block'),
 c('financialcheck-bill-and-collection','scam','Her storage provider. The usual monthly invoice is due and I can take the card payment now on this call.','block'),
 c('financialcheck-empty-recording','scam','Automated personal contact message. Please add the sender to your chat contacts. That is all.','block'),
 c('financialcheck-empty-callback','scam','The enquiry desk. Have her call us at her convenience; the subject is not available in this message.','block'),
 c('financialcheck-caution-phone','legit','Her music tutor returning the phone call she made earlier about arranging a lesson.','hold',true),
 c('financialcheck-caution-result','legit','Her optician following up on the glasses she ordered. They are ready for her to collect.','approve',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'financial-purpose-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('financialcheck-identity-absent','legit',['Her regular instalment arrived today, so the agreed balance is up to date.','I am the accounts clerk at the furniture shop she bought from.'],'approve'),
 s('financialcheck-unresolved-credit','legit',['The adjustments office about a credit on her account. We need a word with her.','She asked us to explain how the credit changes her next bill. That is the purpose of this call.'],'approve'),
];
