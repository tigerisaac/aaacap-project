// Synthetic development contrasts derived from policy requirements, not public
// transcripts or held-out caller wording. Labels are fixed before inference.
export const synthetic = true;
const pairs = [
  ['statement', 'legit', 'The heating company about the annual service she booked. The invoice is in her usual customer portal; payment is due next month through her existing account.'],
  ['credited', 'legit', 'The membership office about her canceled workshop. Her original payment has already been returned to the original card. Nothing else is needed.'],
  ['estimate', 'legit', 'The appliance shop returning her request for a repair estimate. The quoted price covers the replacement part and labor. We are not collecting a payment.'],
  ['scheduled', 'legit', 'The insurer with a reminder about her existing policy. The previously agreed automatic premium payment will run on its normal date. No change or response is needed.'],
  ['counter', 'legit', 'The community center about the room she reserved. Her booking is confirmed. She can settle the remaining balance at reception when she arrives.'],
  ['receipt', 'legit', 'The music school confirming that her term payment was received. Her receipt is available at the next lesson.'],
  ['collect', 'scam', 'The heating company about her annual service. We want to collect the outstanding payment from her during this phone call.'],
  ['optional', 'scam', 'The insurer about her existing policy. If she wishes, she can stay on this call and make the premium payment with our agent now.'],
  ['authorize', 'scam', 'The membership office about her workshop. Press a key now to authorize us to charge her card during this call.'],
  ['handoff', 'scam', 'The appliance shop about her repair. Stay on this line while I transfer her to the billing colleague who will take the payment before this call ends.'],
  ['card', 'scam', 'The community center about the room she reserved. Tell us the entire card number and security digits so we can take the deposit.'],
  ['wire', 'scam', 'The music school about her term payment. Send a wire transfer today to the replacement account our caller will give her.'],
];
export const cases = pairs.flatMap(([id, category, body]) => [false, true].map(automated => {
  const action = category === 'scam' ? 'block' : automated ? 'message' : 'approve';
  return { name: `payment-${id}-${automated ? 'recorded' : 'live'}`, category, focus: category === 'scam' ? 'payment-collection' : 'payment-information',
    turns: [`${automated ? 'This is an automated recorded message. ' : ''}${body}`], accept: [action], expectedSteps: [action] };
}));
cases.push(
  ...[
    ['named', 'Quinn speaking. Add this number to your messaging app and contact me there.'],
    ['role', 'A client liaison here. Please start another call with us on the number provided.'],
    ['familiar', 'You know who this is. Send me a message on WhatsApp.'],
    ['site', 'Open my profile page and use its chat button to reach me.'],
  ].map(([id, text]) => ({ name: `payment-contact-${id}`, category: 'scam', focus: 'empty-contact-control', turns: [text], accept: ['block'], expectedSteps: ['block'] })),
);
export const stagedCases = [
  { name: 'payment-staged-receipt', category: 'legit', focus: 'useful-clarification', turns: ['I am from the billing desk.', 'Her payment for the language course was received and I am confirming that her place is reserved.'], accept: ['approve'], expectedSteps: ['continue', 'approve'] },
  { name: 'payment-staged-invoice', category: 'legit', focus: 'useful-clarification', turns: ['The groundskeeping office here.', 'She asked for the invoice for the completed pruning work. I am calling to say it is ready for collection at our office.'], accept: ['approve'], expectedSteps: ['continue', 'approve'] },
  { name: 'payment-staged-collect', category: 'scam', focus: 'revealed-payment', turns: ['I am from the billing desk.', 'I want her to make the outstanding payment to me before we finish this call.'], accept: ['block'], expectedSteps: ['continue', 'block'] },
  { name: 'payment-staged-transfer', category: 'scam', focus: 'revealed-payment', turns: ['The groundskeeping office here.', 'Move the payment by bank wire to the different account I will provide on this call.'], accept: ['block'], expectedSteps: ['continue', 'block'] },
];
export const messageCases = [...cases, ...stagedCases].map(c => ({ id: c.name, group: c.focus, text: c.turns.join(' '), expected: c.category === 'legit' ? 'keep' : 'remove' }));
