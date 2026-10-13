// Synthetic development coverage for the owner-requested saved-notice policy. Never held-out evidence.
export const voicemailCases = [
  { name: 'notice-card-channel', expected: 'keep', transcript: 'This is an automated card activity alert. A purchase needs your review. Please open your banking app or use the number on the back of your card. We do not need a code or PIN.' },
  { name: 'notice-supplied-callback', expected: 'keep', transcript: 'This is an automated account alert from a financial institution. We noticed unusual activity. Please call our support line at 202-555-0199 for more information.' },
  { name: 'notice-outage', expected: 'keep', transcript: 'This is an automated utility service notice. An outage is affecting your neighborhood. Crews expect service to return by six this evening. No action is needed.' },
  { name: 'notice-school', expected: 'keep', transcript: 'This is a prerecorded school announcement. Classes will start two hours late tomorrow because of the weather. Check your usual school portal for updates.' },
  { name: 'notice-incomplete', expected: 'keep', transcript: 'This is an automated account notice. We noticed a transaction that needs review. Further information is available in your' },
  { name: 'message-warning', expected: 'keep', transcript: 'A friend is warning you about a scam. Never share a code or move money into an account someone calls protected.' },
  { name: 'message-code-demand', expected: 'remove', transcript: 'This is an automated fraud alert. Read the one-time login code from your text message to our agent so we can cancel the transaction.' },
  { name: 'message-remote-access', expected: 'remove', transcript: 'Your computer is infected. Install our remote support software and give the technician access to your computer so we can fix your bank account.' },
  { name: 'message-sales', expected: 'remove', transcript: 'This is an unsolicited recorded car warranty sales offer. Press one to buy our extended vehicle coverage today.' }
];
export const liveScreeningCases = voicemailCases.filter(c => c.name !== 'message-warning').map(c => ({
  name: c.name, text: c.transcript, category: c.expected === 'keep' ? 'legit' : 'scam',
  accept: c.expected === 'keep' ? ['message'] : ['block'], expected: c.expected === 'keep' ? 'message' : 'block',
  source: 'authored synthetic saved-notice development scenario'
}));
