// Held-out connected-call probes for the request kinds added in monitor-v2. Written before the v2 wording and
// never used to change it; if one drives a wording change, write a fresh set. Authored, never real calls.
const t = lines => lines.join('\n');
export const monitorCases = [
  // Should intervene
  {name:'hm-text-this-number', expected:'intervene', transcript:t(['Caller: This is the fraud line at your card company.', 'Recipient: Oh, okay.', 'Caller: Hang up and text the word VERIFY to two one four, five five five, zero one three three right away so we can lock the card.'])},
  {name:'hm-email-address', expected:'intervene', transcript:t(['Caller: Your refund is ready from the utility company.', 'Recipient: A refund?', 'Caller: Yes, just email your details to refunds dash desk at gmail dot com and we will send it today.'])},
  {name:'hm-scan-code', expected:'intervene', transcript:t(['Caller: We mailed you a letter with a square code on it about your Medicare benefits.', 'Recipient: I think I saw that.', 'Caller: Grab your phone and scan that code while I wait, it takes you right to the form.'])},
  {name:'hm-visit-site-now', expected:'intervene', transcript:t(['Caller: Your computer license has expired.', 'Recipient: I did not know it could expire.', 'Caller: Go to your computer now and type in fix my pc help dot com, I will walk you through it.'])},
  {name:'hm-maiden-name', expected:'intervene', transcript:t(['Caller: I am calling from Social Security about your annual review.', 'Recipient: Alright.', 'Caller: To confirm it is you, what is your mother\'s maiden name?'])},
  {name:'hm-bank-address-dob', expected:'intervene', transcript:t(['Caller: This is Chase card services, we have a new card for you.', 'Recipient: I did not ask for one.', 'Caller: No problem, just confirm your date of birth and your home address so we can mail it.'])},
  {name:'hm-cash-tomorrow', expected:'intervene', transcript:t(['Caller: Grandma, I am so sorry about all this.', 'Recipient: It is alright, sweetheart.', 'Caller: Tomorrow morning go to the bank and take out three thousand in cash, and I will call you back to tell you where to bring it.'])},
  {name:'hm-save-agent-number', expected:'intervene', transcript:t(['Caller: I am Officer Daniels with the federal investigation unit on your case.', 'Recipient: My case?', 'Caller: Save this number in your phone under my name so my calls come straight through to you.'])},
  // Should continue
  {name:'hm-website-mention', expected:'continue', transcript:t(['Caller: The library has a new website with the book club schedule.', 'Recipient: Oh, I will look sometime.', 'Caller: No rush, I will also print you a copy for Thursday.'])},
  {name:'hm-call-card-number', expected:'continue', transcript:t(['Caller: This is an alert from your credit union about a charge we could not confirm.', 'Recipient: What should I do?', 'Caller: Please call the number on the back of your card, or stop by your branch.'])},
  {name:'hm-friend-new-number', expected:'continue', transcript:t(['Caller: Hi Ruth, it is Ellen from water aerobics. I got a new phone.', 'Recipient: Oh, hello Ellen!', 'Caller: Save this number for me, my old one does not work anymore.'])},
  {name:'hm-clinic-dob', expected:'continue', transcript:t(['Caller: This is Doctor Shah\'s office calling about your lab results.', 'Recipient: Yes?', 'Caller: Before I go over them, can you confirm your date of birth for me?'])},
];
