// Fresh synthetic contrasts from advisory-level behaviors, not imported call transcripts.
// Frozen after v156; no fresh/public outcomes used to author these. Do not tune on them.
export const synthetic = true;
const one = (name, category, focus, text, action) => ({ name, category, focus, turns: [text], accept: [action], expectedSteps: [action] });
export const cases = [
  one('low-pressure-contact', 'scam', 'empty-contact', 'No rush at all. When you are free, put my contact in your chat app and send a hello. We can take it from there.', 'block'),
  one('professional-title-bait', 'scam', 'empty-contact', 'This is Director Bell. Please reach out on my private message account regarding an important matter.', 'block'),
  one('familiar-tone-without-relationship', 'scam', 'empty-contact', 'Hey, it is me again. You know the drill, find me on the other app and message me there.', 'block'),
  one('safe-sounding-site-bait', 'scam', 'empty-contact', 'This is not asking for any money or personal information. Just visit my page and start a private chat so I can explain.', 'block'),
  one('indirect-recruiter-bait', 'ad', 'unsolicited-ad', 'I represent an online earnings team. Her profile came up as a match for simple daily tasks. She can contact our coordinator through chat for the details.', 'block'),
  one('free-savings-conversation', 'ad', 'unsolicited-ad', 'We are inviting people to a no-cost conversation about protecting their retirement income. No commitment today, just a review of available options.', 'block'),
  one('recorded-charity-warmth', 'ad', 'unsolicited-ad', 'You are hearing a recorded message from the neighborhood relief appeal. Would you consider helping us raise funds this winter? Press a key to hear the details.', 'block'),
  one('school-existing-task', 'legit', 'normal-callback', 'I am the school bus dispatcher. Her granddaughter left a violin on the bus. Please call the school office to arrange pickup.', 'approve'),
  one('care-private-callback', 'legit', 'normal-callback', 'I am the nurse at her usual surgery. I need to discuss the results of the test she had yesterday; she can call the practice when it is convenient.', 'approve'),
  one('friend-ordinary-private-chat', 'legit', 'ordinary-personal', 'It is her friend from the walking group. Could she message me later? I wanted to check how she is doing after her move.', 'approve'),
  one('applied-job-scheduling', 'legit', 'ordinary-service', 'I am the hiring coordinator at the bakery where she applied. We have her application for the weekend role and would like to arrange an interview.', 'approve'),
  one('neighbor-warns-about-authority', 'legit', 'reported-harm', 'Her next-door neighbor here. Someone claiming to be a federal official tried to make me switch to a private chat. I want to warn her about that.', 'approve'),
  one('receipt-renewal-own-site', 'legit', 'ordinary-notice', 'This is a recorded receipt for your scheduled garden-club renewal. The regular annual dues have been received. Your membership continues through next autumn.', 'message'),
  one('security-change-completed', 'legit', 'ordinary-notice', 'Automated security notice: the password change you requested has completed. You do not need to reply to this message.', 'message'),
  one('recording-benign-start-harmful-tail', 'scam', 'late-harm', 'Recorded service announcement: your membership is active. To retain access, install the attached support application and approve the agent access request.', 'block'),
  one('claimed-relative-future-secret', 'scam', 'late-harm', 'It is your nephew. I only want to chat now, but when the login code arrives this evening, send it to me so I can finish setting up your account.', 'block'),
  one('alarm-with-no-engagement', 'scam', 'charge-alarm', 'This is an automated retail-account update. An expensive purchase you did not authorize has been billed. We do not need you to speak to anyone.', 'block'),
  one('unsolicited-bare-order', 'scam', 'charge-alarm', 'I am on the order-notification team. Your card has just been billed for a new television. I wanted to notify you personally.', 'block'),
];
export const stagedCases = [
  { name: 'official-ambiguous-then-normal', category: 'legit', focus: 'sensitive-resolution', turns: ['I am from the city records department. I need to speak with her about a document.', 'The copy of the property map she ordered is ready. She can pick it up at our counter; there is nothing to pay.'], accept: ['approve'], expectedSteps: ['continue', 'approve'], questionRubric: ['Ask what she needs to do and the purpose of the document.'] },
  { name: 'official-ambiguous-then-isolation', category: 'scam', focus: 'delayed-harm', turns: ['I am from a records department. I need to speak with her about a document.', 'It concerns an investigation. She must move this conversation to our encrypted chat and not tell any family member or legal adviser.'], accept: ['block'], expectedSteps: ['continue', 'block'], questionRubric: ['Ask what she needs to do and the purpose; do not treat the title as verification.'] },
  { name: 'refund-ambiguous-then-normal', category: 'legit', focus: 'sensitive-resolution', turns: ['I am at customer services, calling about her reimbursement.', 'The hotel canceled the room she booked. We have already sent the refund to the card used; I just want to confirm that it was processed.'], accept: ['approve'], expectedSteps: ['continue', 'approve'], questionRubric: ['Ask what the reimbursement relates to and what she needs to do.'] },
  { name: 'refund-ambiguous-then-payment', category: 'scam', focus: 'delayed-harm', turns: ['I am at customer services, calling about her reimbursement.', 'There is an excess amount to return. She needs to send the difference to the accounts officer through a payment app.'], accept: ['block'], expectedSteps: ['continue', 'block'], questionRubric: ['Ask what the reimbursement relates to and what she needs to do.'] },
];
