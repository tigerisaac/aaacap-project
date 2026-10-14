// Fresh synthetic connected conversations, frozen before inference. Timing is tested separately in the emulator.
// No public/private transcript, test-specific prompt change, or presumed verification of a claimed identity.
const common = 'Caller: Hello, it is Morgan. I wanted to catch up about this week.\nRecipient: Hello Morgan, I have a few minutes.\n';
const cases = [
  ['code-after-small-talk', 'intervene', 'Caller: Before we finish, read me the sign-in code that just arrived on your phone.'],
  ['family-cash-pickup', 'intervene', 'Caller: It is your niece. I am in trouble. Withdraw two thousand dollars and put it in an envelope for the driver I am sending.'],
  ['install-before-tomorrow', 'intervene', 'Caller: Tomorrow I can help recover the money. Tonight install the remote-control application and leave its access code on the desk for me.'],
  ['contact-elsewhere-no-context', 'intervene', 'Caller: I cannot explain this here. Message my new WhatsApp number and I will tell you what this is about.'],
  ['document-email-pivot', 'intervene', 'Caller: Please end this call and email our case office at case-team@example.invalid. That is where you must continue this conversation.'],
  ['investment-slow-pitch', 'intervene', 'Caller: We have only just met, but I can put you into a guaranteed trading opportunity. Start by transferring five hundred dollars while I guide you.'],
  ['ordinary-hospital-update', 'continue', 'Caller: I am the nurse caring for your husband. His observation period is finished and he is comfortable. He asked me to let you know that visiting hours start at two.'],
  ['ordinary-delivery-callback', 'continue', 'Caller: I am delivering the table you ordered. If you miss me, you can call the store using the number on your receipt to arrange another delivery.'],
  ['ordinary-refund-complete', 'continue', 'Caller: The refund for the broken chair has already gone back to your original card. There is nothing you need to do, and I do not need any numbers from you.'],
  ['ordinary-scam-warning', 'continue', 'Caller: A man asked me to message a number on WhatsApp yesterday, but I did not. If anyone asks you for a code, hang up.'],
  ['ordinary-in-person-repayment', 'continue', 'Caller: I still owe you for the groceries. I will bring the cash when I come round on Saturday.'],
  ['ordinary-known-new-number', 'continue', 'Caller: It is Morgan from next door. We watered your plants together yesterday. This is my new mobile number; save it for arranging our next gardening day.']
];
export const monitorCases = cases.flatMap(([name, expected, ending]) => [
  { name: `${name}-opening`, expected: 'continue', transcript: common },
  { name, expected, transcript: common + ending }
]);
