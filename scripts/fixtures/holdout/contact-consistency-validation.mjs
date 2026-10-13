// Fresh conversational validation after v144 freeze. Independently authored;
// no public scripts or earlier validation text. Do not tune from outcomes.
export const synthetic=true;
const c=(name,category,text,action,caution=false)=>({name,category,focus:'contact-consistency-validation',turns:[text],accept:[action],expectedSteps:[action],...(caution?{caution:true}:{})});
export const cases=[
 c('consistencycheck-introduction','scam','Lena speaking, yes. Could she drop me a note on the messaging app when she gets this?','block'),
 c('consistencycheck-other-relationship','scam','I know her nephew. Tell her to save my contact and message me, and then we can talk.','block'),
 c('consistencycheck-charge','scam','About her shopping account: there’s a new purchase she hasn’t confirmed. We are calling to flag it for her.','block'),
 c('consistencycheck-automated-alarm','scam','You are hearing an automated account notice. A debit with no explanation has been posted to her account.','block'),
 c('consistencycheck-command','scam','The support desk calling. Ask her to open the command window and run the text we provide to repair access.','block'),
 c('consistencycheck-personal-code','scam','It’s her old friend. Have her tell me the login code that just arrived so I can finish helping her.','block'),
 c('consistencycheck-neighbor-warning','legit','It’s her neighbor, Dev. Someone tried to get me to install a control app, and I want to warn her not to do that.','approve'),
 c('consistencycheck-colleague','legit','We worked together at the bookshop for years. I wanted to catch up with her, that’s all.','approve'),
 c('consistencycheck-service-bill','legit','The mobility equipment office. The statement for the chair she hired is ready in her normal account; I’m only letting her know.','approve'),
 c('consistencycheck-refund-result','legit','The theatre box office. We finished the refund she asked for on her unused tickets. She can see the completed credit in her usual account.','approve'),
 c('consistencycheck-personal-cost','legit','Her friend from the choir. I covered her share of lunch and just want to tell her what it came to.','approve'),
 c('consistencycheck-callback-arriving','legit','The parcel driver, calling her back. She asked me to let her know when I reached the side gate, and I’m there now.','approve'),
 c('consistencycheck-care-demographic','legit','Her regular eye clinic. I need to confirm her date of birth for the appointment she booked next week.','approve'),
 c('consistencycheck-service-plus-offer','legit','The locksmith she booked. Her replacement lock is fitted and I’m arranging collection of the spare keys. We also have maintenance plans if she’s interested.','approve'),
 c('consistencycheck-pickup-notice','legit','Recorded reminder: the library books she reserved can be collected until Thursday. Press a key to replay this notice.','message'),
 c('consistencycheck-weather-notice','legit','This is an automated community weather warning. The low bridge will be closed overnight because of flooding.','message'),
 c('consistencycheck-tax-service','ad','Financial relief calling. We are offering a service to reduce her overdue taxes and want to get her started.','block'),
 c('consistencycheck-health-offer','ad','Coverage advisers here. Our free review can switch her to a plan with extra benefits; we’d like to discuss signing her up.','block'),
 c('consistencycheck-caution-phone','legit','Her cousin returning the conversation that was cut off a few minutes ago.','hold',true),
 c('consistencycheck-caution-recording','legit','This automated return call confirms that her requested outpatient appointment has been moved to Friday.','message',true),
];
const s=(name,category,turns,final)=>({name,category,focus:'contact-consistency-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('consistencycheck-stage-balance','legit',['The payments office about a balance in her favor. We need to speak to her.','It’s the duplicate amount she asked us to return for her course. The reversal is complete and this is only the update.'],'approve'),
 s('consistencycheck-stage-incoming','legit',['Hi there. Is she around to talk?','I’m her home care coordinator, arranging which worker will visit tomorrow.'],'approve'),
 s('consistencycheck-stage-emergency','scam',['The liaison officer about an urgent situation involving her grandson.','She must take cash out and pass it to our driver to secure his release.'],'block'),
 s('consistencycheck-stage-private-office','unclear',['The records department on an account matter. We would like her on the line.','I can’t give you the purpose or the required action. She must speak to me first.'],'hold'),
];
