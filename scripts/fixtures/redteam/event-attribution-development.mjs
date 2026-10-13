// New synthetic development contrasts for event context, attributed requests
// and call-reference scope. No public or held-out source text.
export const synthetic=true;
const c=(name,category,focus,text,action,caution=false)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('event-bare-charge','scam','charge-alarm','The account team. There is an unexplained charge we need to discuss with her.','block'),
 c('event-unspecified-debit','scam','charge-alarm','The payment review desk. An unrecognized debit has appeared. This is just an alert.','block'),
 c('event-short-recording','scam','charge-alarm','Automated notice: an unexpected charge was detected. No action is required on this call.','block'),
 c('event-no-amount','scam','charge-alarm','Her card department. We need to check whether the new purchase on her account belongs to her.','block'),
 c('event-expected-failure','legit','ordinary-live','The swimming pool office about the classes she booked. Her agreed payment failed. She can settle it at the front desk before class.','approve'),
 c('event-expected-delay','legit','ordinary-live','The gardener she hired. The agreed bank payment is taking longer to clear; I am only letting her know and will check again tomorrow.','approve'),
 c('event-recorded-decline','legit','ordinary-notice','This is a recorded notice from the membership service she uses. Her regular renewal payment was declined; her usual account has the details.','message'),
 c('event-recorded-refund','legit','ordinary-notice','Automated message from the travel office: the refund for the trip she cancelled has been returned to the original payment method.','message'),
 c('event-distinct-extra-charge','scam','charge-alarm','The service office about her scheduled order. Separately, an unexplained second purchase has appeared on her card.','block'),
 c('event-alert-beside-receipt','scam','charge-alarm','This is an automated receipt for her regular membership, which was paid. We also detected a different unauthorized debit on the account.','block'),
 c('event-family-own-decline','legit','ordinary-live','Her niece. My own payment was declined at the shop and I am embarrassed. I would like to talk with her.','approve'),
 c('event-warning-charge-caller','legit','ordinary-live','Her neighbor. A stranger called me with a made-up charge story. I am ringing to warn her not to respond if they contact her.','approve'),
 c('event-warn-remote-help','legit','reported-conduct','Her sister. I want to remind her to reject strangers who offer to fix her computer remotely.','approve'),
 c('event-reported-repair-demand','legit','reported-conduct','Her friend. A caller told me to install a repair program, but I refused. I want to tell her about the attempt.','approve'),
 c('event-endorsed-repair-demand','scam','requested-conduct','The service adviser. The stranger who told her to install that repair program is right; she should do what he said.','block'),
 c('event-adopted-remote-offer','scam','requested-conduct','The account adviser. We recommend accepting the other caller’s offer to take control of her computer and fix it.','block'),
 c('event-result-followup-caution','legit','caution-scope','The clinic nurse following up on her recent examination. The results are normal and there is nothing she needs to do.','approve',true),
 c('event-work-followup-caution','legit','caution-scope','Her repair technician following up on yesterday’s visit. The replacement part has arrived and we can fit it tomorrow.','approve',true),
 c('event-phone-followup-caution','legit','caution-scope','Her clinic nurse returning the phone call we missed earlier. I want to confirm her examination time.','hold',true),
 c('event-dropped-caution','legit','caution-scope','Her cousin. Our conversation was cut off, so I am calling again to finish arranging the meal.','hold',true),
 c('event-no-purpose-contact','scam','empty-contact','This is Kendall. Please enter our discussion channel and message us there. The subject will be provided after that.','block'),
 c('event-task-contact','legit','ordinary-live','Her community class tutor. Please message me to choose which practice session she can attend next week.','approve'),
 c('event-live-missing-purpose','clarify','clarification','The scheduling assistant here. Could she come to the phone?','continue'),
 c('event-resolved-legal-update','legit','ordinary-live','Her legal adviser about the case she asked us to handle. The hearing date has been set, and I need to arrange when we can review the papers together.','approve'),
];
export const stagedCases=[];
