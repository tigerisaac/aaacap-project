// Development diagnostics grounded in the known regular-bill identity miss.
// Authored independently of public or fresh validation outcomes. No label changes.
export const synthetic=true;
const c=(name,category,text,action)=>({name,category,focus:'service-role-attribution',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[
 c('role-fragment','legit','Her regular pool cleaning company. The statement for the agreed visits is in her usual customer account.','approve'),
 c('role-full-introduction','legit','I am calling from her regular pool cleaning company. The statement for the agreed visits is in her usual customer account.','approve'),
 c('role-here','legit','The pool cleaning office here, about her regular service. The monthly statement is ready to view through the account she normally uses.','approve'),
 c('role-named','legit','This is Felix from her pool cleaner. The bill for the scheduled visits is ready in her usual account.','approve'),
 c('role-absent','unclear','The statement for the agreed visits is available in the customer account she normally uses.','continue'),
 c('role-third-party-only','unclear','Her pool cleaning company has put the monthly statement in her regular account. I want to tell her about that.','continue'),
 c('role-personal-report','legit','I am her daughter. Her pool cleaning company put a statement in the usual account, and I want to help her check the service dates.','approve'),
 c('role-third-party-warning','legit','This is Nessa from the tenants committee. Someone claiming to be a cleaning service is asking people for bank passwords. I want to warn her to refuse.','approve'),
 c('role-empty-contact','scam','The pool cleaning office here. Send my online account a greeting. I have no service matter to discuss.','block'),
 c('role-collection','scam','Her pool cleaning company. For the agreed visits, please give me her full payment card number so I can take payment while we talk.','block'),
 c('role-distinct-charge','scam','Her regular pool cleaner. Her usual invoice is ready, but a separate purchase she did not make has also been charged to her card.','block'),
 c('role-recorded-receipt','legit','Automated receipt from her pool cleaning service. The regular payment she arranged has been received. There is no action needed.','message'),
];
