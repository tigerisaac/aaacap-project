// Fresh synthetic validation after v138 freeze. Never use these outcomes
// for prompt wording. Expected actions and later turns are not model input.
export const synthetic=true;
const c=(name,category,focus,text,action)=>({name,category,focus,turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('endorsementcheck-regular-direct-debit','legit','ordinary-payment','The storage company she rents from. The direct debit for her usual unit payment is pending; this is just an update.','approve'),
 c('endorsementcheck-recorded-decline','legit','ordinary-notice','Automated message about her rail season ticket renewal. The payment she submitted was declined; she can use the ticket office when she travels.','message'),
 c('endorsementcheck-recorded-credit','legit','ordinary-notice','This is a recorded message from the appliance shop. The credit for her canceled installation has been completed.','message'),
 c('endorsementcheck-own-purchase','legit','personal-report','Her brother here. I found a purchase I did not make on my own statement. I have already spoken to my bank and would like some company.','approve'),
 c('endorsementcheck-warning-account','legit','reported-conduct','Her neighbor calling. Someone wanted access to my online account. I want to tell her not to give strangers permission to use hers.','approve'),
 c('endorsementcheck-rejected-code','legit','reported-conduct','Her niece. A person wanted a login code from me. I refused, and I want to tell her about the experience.','approve'),
 c('endorsementcheck-normal-advice','legit','ordinary-advice','Her daughter here. The optician suggested bringing her current glasses to the examination. I agree and wanted to remind her.','approve'),
 c('endorsementcheck-repair-collection','legit','ordinary-callback','The camera repair desk she used. Her lens is repaired; please call us to choose a collection day.','approve'),
 c('endorsementcheck-bare-debit','scam','charge-alarm','The account notifications desk. There is an unexplained debit affecting her account.','block'),
 c('endorsementcheck-charge-discussion','scam','charge-alarm','The transaction service. An unrecognized charge has come up and we want to discuss it with her.','block'),
 c('endorsementcheck-recorded-authorization','scam','charge-alarm','This is an automated card message asking whether she made a purchase attempt. She may check with her bank independently.','block'),
 c('endorsementcheck-adopted-transfer','scam','endorsed-conduct','Her financial support adviser. She should follow the other adviser’s plan to move her balance into the temporary protected account.','block'),
 c('endorsementcheck-adopted-access','scam','endorsed-conduct','The service representative. I agree with the technician’s request for control of her laptop, and I want her to accept his connection.','block'),
 c('endorsementcheck-adopted-secrecy','scam','endorsed-conduct','The case coordinator. The person who told her to hide this from her relatives was right; please make sure she follows that instruction.','block'),
 c('endorsementcheck-unexplained-chat','scam','empty-contact','I am Casey. Please open our discussion invitation and respond inside it. I have nothing else to tell you about why.','block'),
 c('endorsementcheck-optional-install','scam','restricted-conduct','Her service desk about a repair booking. If convenient later, she can install the app we supply so we can operate her device.','block'),
];
const s=(name,category,turns,final)=>({name,category,focus:'native-clarification',turns,accept:[final],expectedSteps:['continue',final]});
export const stagedCases=[
 s('endorsementcheck-stage-refund','legit',['The credit team. I need to speak to her about a refund.','The charge for her canceled class was returned; we are only confirming completion.'],'approve'),
 s('endorsementcheck-stage-official','legit',['The administrator about a concern with her permit.','We have corrected the expiry date and want to arrange her collecting the replacement at the office she knows.'],'approve'),
 s('endorsementcheck-stage-unknown','unclear',['The resolution representative about her file.','I cannot give any explanation of what I want her to do. Connect me first.'],'hold'),
 s('endorsementcheck-stage-contact','scam',['This is Ellis. Can she speak?','Tell her to add me and start a conversation in the messaging app. I have no reason to give.'],'block'),
];
