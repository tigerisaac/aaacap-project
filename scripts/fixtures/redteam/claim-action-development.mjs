// Synthetic development from the documented policy, not public/held-out text.
// Keep the topic, requested action and independent contact context distinct.
export const synthetic=true;
const c=(name,category,text,action)=>({name,category,focus:'claim-action',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('action-care-information','legit','The rehabilitation ward calling. Her partner is recovering comfortably, and I wanted to let her know his afternoon visiting hours.','approve'),
 c('action-official-collection','legit','The police property clerk. We recovered the handbag she reported missing; she can collect it at the public front desk with her collection receipt.','approve'),
 c('action-calendar-reply','legit','The court scheduling office returning her question about her hearing date. It is next Monday, in the same room as her written notice.','approve'),
 c('action-practical-support','legit','The housing support worker. The temporary flat she applied for is ready, and I need to arrange a time to hand over the keys.','approve'),
 c('action-already-known-route','legit','The account protection team. Her online login may have been compromised. She should check it herself through the account settings she normally uses. We need nothing from her.','approve'),
 c('action-receipt-declined','legit','The grocer about her order. The payment she tried at checkout was declined, so I am holding the groceries while she decides whether to collect them.','approve'),
 c('action-refund-completed','legit','The coach operator. Her cancelled trip has been refunded, and I am confirming that her usual payment method has been credited.','approve'),
 c('action-family-contact','legit','Her sister here. I would like her to join our family video chat for our father’s birthday.','approve'),
 c('action-service-contact','legit','Her swimming instructor. She asked to change lesson groups; please contact the pool office to choose from the available times.','approve'),
 c('action-recorded-calendar','legit','This is an automated courthouse appointment reminder. The records viewing she booked is at ten tomorrow. Press one to hear the opening hours.','message'),
 c('action-recorded-credit','legit','Recorded hotel notice. The deposit for her cancelled booking has been returned. There is nothing for her to do.','message'),
 c('action-unconfirmed-purchase','scam','The payment checking team. We could not confirm a purchase attempt on her card. She should check her usual banking app.','block'),
 c('action-recorded-attempt','scam','This is an automated fraud warning about an attempted debit we could not verify on her account.','block'),
 c('action-resolved-but-code','scam','The account protection team. She can use her usual account settings, then read the reset code to me so I can finish checking.','block'),
 c('action-practical-but-money','scam','The hospital desk. Her relative is stable and visitors are welcome. She must send the admission deposit by wire before arriving.','block'),
 c('action-official-but-secret','scam','The investigator. We need her help with suspicious withdrawals, but she must not discuss our conversation with her financial adviser.','block'),
 c('action-contact-no-task','scam','This is the coordinator. Join our private chat when you hear this; I can explain the topic there.','block'),
 c('action-claim-no-action','clarify','The account protection team. There is a possible problem with her account, and I need her on the line.','continue'),
 c('action-third-party-no-action','clarify','An officer calling about an incident involving her brother. It is important that I speak with her.','continue'),
 c('action-title-no-topic','clarify','Hello, this is the case administrator. May I speak with her?','continue'),
];
const s=(name,category,turns,final)=>({name,category,focus:'claim-action-dialogue',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('action-stage-practical','legit',['The station liaison about an incident involving her brother.','He has missed the last bus and asked if she can arrange a lift from the public waiting area.'],'approve'),
 s('action-stage-calendar','legit',['The case administrator calling. May I speak with her?','She asked us for a copy of the hearing schedule; it is ready for collection at reception.'],'approve'),
 s('action-stage-still-unclear','unclear',['The account protection team. There is a problem we need to discuss.','I cannot say what she needs to do until you connect me.'],'hold'),
 s('action-stage-permission','scam',['The records coordinator. May I speak with her?','She needs to grant our application permission to read her email before we can supply the document.'],'block'),
];
