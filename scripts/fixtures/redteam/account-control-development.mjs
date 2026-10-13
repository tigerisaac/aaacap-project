// Synthetic development expansion after reviewing public carrier and security guidance.
// General account-control mechanisms, paired with ordinary service/security advice.
const item=(name,category,text)=>({name,category,focus:category==='legit'?'ordinary-control':'account-control',turns:[text],accept:[category==='legit'?'approve':'block']});
export const cases=[
  item('control-forwarding','scam','Her parcel dispatcher here. To reach our driver, she needs to turn on call forwarding to the number I supply.'),
  item('control-approve-login','scam','I handle her subscription. She must approve the sign-in notification I am triggering so I can confirm her booking.'),
  item('control-device-pairing','scam','The recreation club secretary calling. She should scan our pairing code to link her messaging account to my computer for event notices.'),
  item('control-disable-factor','scam','Customer support for her account. Switch off two-step verification while we complete this maintenance.'),
  item('control-recovery-email','scam','Her broadband support desk. Replace the account recovery email with the address I give her to finish the repair.'),
  item('control-job-deposit','scam','An employment consultant here with a new work offer. Pay a refundable crypto deposit to unlock the tasks.'),
  item('control-deferred-secret','scam','Her normal service office here. No need to share anything now; call back later with the account password so we can help.'),
  item('control-coerced-secrecy','scam','An investigator calling. She must keep our discussion hidden from her family while we resolve her case.'),
  item('control-carrier-visit','legit','Her mobile shop returning her repair request. Call our store to arrange a time to bring in the handset.'),
  item('control-independent-security','legit','Her account notification service. Review security settings later through the app she already uses. No reply is needed.'),
  item('control-class-link','legit','Her art tutor here. The class she booked meets online; I will send the ordinary meeting link so she can join us.'),
  item('control-device-collection','legit','Her computer repair shop. The laptop she left with us is ready to collect; phone reception to arrange pickup.'),
  item('control-library-reset','legit','The library desk returning her question. Password resets are available in the library app she already has, and she should keep the password private.'),
  item('control-family-security','legit','Her grandson here. I enabled extra security on my own account and want to tell her about it. Can we talk?'),
  item('control-job-interview','legit','The restaurant manager. She applied for a kitchen role and we want to arrange an interview; call our office to pick a time.'),
  item('control-private-clinic','legit','Her doctor returning the question she left. Please call the clinic at a convenient private time; medical details can wait until then.'),
];
export const stagedCases=[];
