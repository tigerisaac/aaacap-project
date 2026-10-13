// Additional synthetic development contrasts for identity, private matters and ordinary service.
// Original development callers and labels remain frozen in their own source file.
import {cases as earlier,stagedCases} from './current-notice-security-development.mjs';
const c=(name,category,text,action)=>({name,category,focus:'identity-purpose',turns:[text],accept:[action],expectedSteps:[action]});
export const cases=[...earlier,
 c('identity-role-no-task','unclear','The administrative desk. I have an important matter to discuss with her.','continue'),
 c('identity-clinic-private','legit','Her clinic nurse returning the question she sent about her treatment. I can discuss the medical details only with her.','approve'),
 c('identity-service-request','legit','The heating engineer responding to the repair request she made yesterday. I need to arrange a visit.','approve'),
 c('identity-family-private','legit','I am her cousin. I want a private conversation with her about something personal.','approve'),
 c('identity-task-no-name','unclear','I need to ask whether she is available for an existing appointment.','continue'),
 c('identity-third-party-topic','unclear','A legal representative. I need to speak with her about her brother’s situation.','continue'),
 c('identity-school-news','legit','The school secretary. Her grandchild’s afternoon class has been moved to another room.','approve'),
 c('identity-business-empty','scam','The liaison department. Have her call us back; we are giving no relationship or task.','block'),
];
export {stagedCases};
export const sourceFiles=['scripts/fixtures/redteam/current-notice-security-development.mjs'];
