// Synthetic post-call validation authored after freezing message-contact-v5.
// Preserve labels/outcomes; do not use this holdout to tune the prompt.
const c = (id, group, expected, text) => ({ id, group, expected, text });
export const messageCases = [
  c('message-empty-chat', 'empty-contact', 'remove', 'Please send a hello to my messaging account.'),
  c('message-empty-name', 'empty-contact', 'remove', 'Hi, this is Quinn. Please call me back.'),
  c('message-empty-office', 'empty-contact', 'remove', 'The information office. Visit our page to contact us.'),
  c('message-empty-recording', 'empty-contact', 'remove', 'Automated message. Add this number to your contacts and message it.'),
  c('message-empty-private', 'empty-contact', 'remove', 'I need a private chat. Send a message to the account in my invitation.'),
  c('message-empty-polite', 'empty-contact', 'remove', 'I hope you are well. Get in touch with me at this number when you have time.'),
  c('message-empty-business', 'empty-contact', 'remove', 'A message from the liaison department. Please return our call.'),
  c('message-empty-new-contact', 'empty-contact', 'remove', 'Save my new number and text me when you receive this.'),
  c('message-friend-new-number', 'ordinary-callback', 'keep', 'Your friend from the book club. This is my new number; give me a call to arrange our next meeting.'),
  c('message-family-private', 'ordinary-callback', 'keep', 'Your niece. I would like a private talk when you are free. Call me back.'),
  c('message-service-collection', 'ordinary-callback', 'keep', 'The tailor. Your altered jacket is ready; call the shop to arrange collection.'),
  c('message-care-followup', 'ordinary-callback', 'keep', 'Your eye clinic returning your question about the prescription. Please call the clinic to discuss the answer.'),
  c('message-delivery-chat', 'ordinary-callback', 'keep', 'The driver bringing the furniture you ordered. Send me a message to confirm which entrance to use.'),
  c('message-refund-complete', 'ordinary-callback', 'keep', 'The workshop you booked was canceled and your payment has been refunded. Call the booking office if you want further information.'),
  c('message-requested-interview', 'ordinary-callback', 'keep', 'The cafe manager responding to your job application. Please call to arrange an interview.'),
  c('message-private-role-incomplete', 'uncertain-information', 'keep', 'Your community support adviser. I have an update about your assistance application, but the line is breaking up.'),
  c('message-notice-charge', 'unverified-notice', 'keep', 'Automated charge notification. A new purchase was charged to your account; call the supplied number to review it.'),
  c('message-notice-outage', 'ordinary-notice', 'keep', 'Recorded service announcement. Scheduled maintenance will interrupt water service this evening.'),
  c('message-notice-account', 'unverified-notice', 'keep', 'Automated account security notification. Open the app you normally use later to review your settings.'),
  c('message-notice-visit', 'ordinary-notice', 'keep', 'Recorded reminder of your booked assessment tomorrow morning. Press a key to repeat this message.'),
  c('message-explicit-code', 'harmful-request', 'remove', 'The service desk. Call us and read out the one-time bank code we send you.'),
  c('message-explicit-courier', 'harmful-request', 'remove', 'Your funds need protection. Withdraw the balance and hand the cash to our courier.'),
  c('message-explicit-install', 'harmful-request', 'remove', 'Technical support. Install our remote control software so we can access your device.'),
  c('message-explicit-secrecy', 'harmful-request', 'remove', 'The investigator. Do not let your bank or family learn that we contacted you; call us privately to continue.'),
];
