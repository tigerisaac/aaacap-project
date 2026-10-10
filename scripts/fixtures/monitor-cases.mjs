// Connected-call transcripts for the monitoring prompt. Real conversations must continue; scams must be stopped.
// Lines are labeled the way the webhook labels Telnyx tracks. Never paste these into the prompt.
const t = lines => lines.join('\n');
export const monitorCases = [
  // Real conversations that mention money, banks, codes or scams.
  {name:'m-grandson-repaid', expected:'continue', transcript:t(['Caller: Hey Grandma, it is Tyler.', 'Recipient: Hi sweetie!', 'Caller: I just sent you back the fifty dollars on Venmo, did you see it?', 'Recipient: Oh, I will check. Thank you, honey.'])},
  {name:'m-daughter-bank-fixed', expected:'continue', transcript:t(['Caller: Mom, did the bank fix that weird charge?', 'Recipient: Yes, I called the number on my card and they reversed it.', 'Caller: Good. Never give anyone your card number over the phone, okay?'])},
  {name:'m-friend-scam-story', expected:'continue', transcript:t(['Caller: Someone called me yesterday saying they were from Medicare and wanted my Medicare number and my bank account.', 'Recipient: Oh my goodness, what did you do?', 'Caller: I hung up! I just wanted to warn you.'])},
  {name:'m-clinic-bring-card', expected:'continue', transcript:t(['Caller: This is Kim from Doctor Patel’s office, confirming Thursday at two thirty.', 'Recipient: Yes, I will be there.', 'Caller: Great, please bring your Medicare card and a list of your medications.'])},
  {name:'m-son-ipad-in-person', expected:'continue', transcript:t(['Caller: Mom, I will come over Saturday and set up your new iPad.', 'Recipient: Oh good, I can never remember those passwords.', 'Caller: We will make a new password together when I am there.'])},
  {name:'m-neighbor-borrow', expected:'continue', transcript:t(['Caller: Hi hon, it is Barb next door. Could I borrow twenty dollars until Friday?', 'Recipient: Of course, come by after lunch.', 'Caller: Thank you, I will pop over at one.'])},
  {name:'m-recipient-pin-story', expected:'continue', transcript:t(['Recipient: I forgot my PIN at the ATM today, so embarrassing.', 'Caller: Oh no! Did you get it sorted out?', 'Recipient: Yes, they helped me at the branch.'])},
  {name:'m-theater-payback', expected:'continue', transcript:t(['Caller: The theater tickets were forty dollars each.', 'Recipient: I will pay you back when we meet there Saturday.', 'Caller: Sounds good, no rush at all.'])},
  {name:'m-pharmacy-copay', expected:'continue', transcript:t(['Caller: This is Ken at CVS, your prescription is ready.', 'Recipient: How much will it be?', 'Caller: Your copay is twelve dollars, you can pay when you pick it up.'])},
  {name:'m-grandkid-flat-tire', expected:'continue', transcript:t(['Caller: Grandpa, I got a flat tire on Route 9.', 'Recipient: Are you safe?', 'Caller: Yes, I am at the gas station. Can you come help me change it?'])},
  // Scams that got through the screen.
  {name:'m-bank-otp-pivot', expected:'intervene', transcript:t(['Caller: Hi Margaret, this is Dan from the fraud team at your bank.', 'Recipient: Oh, is something wrong?', 'Caller: We stopped a charge. I am sending you a code now, please read it back to me so we can cancel it.'])},
  {name:'m-recipient-reads-code', expected:'intervene', transcript:t(['Caller: Did you get the text with the number?', 'Recipient: Yes, it says four seven two', 'Recipient: nine one six'])},
  {name:'m-tech-anydesk', expected:'intervene', transcript:t(['Caller: Your computer is sending us virus warnings.', 'Recipient: Oh dear.', 'Caller: Go to your computer and download AnyDesk so I can fix it for you.'])},
  {name:'m-gift-cards', expected:'intervene', transcript:t(['Caller: To clear the warrant you need to pay today.', 'Recipient: How do I pay?', 'Caller: Go to Walgreens and buy two five hundred dollar Apple cards, then read me the numbers on the back.'])},
  {name:'m-grandparent-courier', expected:'intervene', transcript:t(['Caller: Grandma, I am in jail, please do not tell Mom.', 'Recipient: Oh no, what happened?', 'Caller: My lawyer says I need eight thousand for bail. A courier will come pick up the cash this afternoon.'])},
  {name:'m-crypto-pitch', expected:'intervene', transcript:t(['Caller: I met your nephew at a conference, nice guy.', 'Recipient: Oh, how nice.', 'Caller: I have been doubling my savings with a crypto trading app, I could get you started tonight with a few thousand.'])},
  {name:'m-bank-secrecy', expected:'intervene', transcript:t(['Caller: The teller at your branch may be involved in the fraud.', 'Recipient: Really?', 'Caller: So when you withdraw the cash tomorrow, do not tell them what it is for.'])},
  {name:'m-medicare-number', expected:'intervene', transcript:t(['Caller: We are updating your Medicare file for the new year.', 'Recipient: Okay.', 'Caller: I just need you to read me your Medicare number to confirm it.'])},
  {name:'m-romance-zelle', expected:'intervene', transcript:t(['Caller: I miss you so much, I cannot wait to finally meet you.', 'Recipient: Me too.', 'Caller: I just need two thousand for the plane ticket. Could you send it through Zelle tonight?'])},
  {name:'m-benign-then-pivot', expected:'intervene', transcript:t(['Caller: The weather has been lovely, has it not?', 'Recipient: It has, I was in the garden all morning.', 'Caller: Wonderful. Oh, while I have you, a little code just came to your phone, could you read that to me?'])},
  // Unlabeled speakers, in case Telnyx does not say which side spoke.
  {name:'u-repaid', expected:'continue', transcript:t(['Speaker: Hey Grandma, it is Tyler.', 'Speaker: Hi sweetie!', 'Speaker: I just sent you back the fifty dollars on Venmo.', 'Speaker: Thank you, honey.'])},
  {name:'u-scam-warning', expected:'continue', transcript:t(['Speaker: Someone called pretending to be my bank and asked me to read them a code.', 'Speaker: Oh no, did you?', 'Speaker: No, I hung up. Never read anyone a code, okay?'])},
  {name:'u-code-readout', expected:'intervene', transcript:t(['Speaker: This is the fraud department, we sent a verification code to your phone.', 'Speaker: Oh, okay, it says five eight', 'Speaker: Go ahead, the rest of the numbers please.'])},
  {name:'u-gift-cards', expected:'intervene', transcript:t(['Speaker: You owe the IRS and must pay today.', 'Speaker: How?', 'Speaker: Buy Target gift cards and read me the numbers on the back.'])},
  // Gray: record what happens for the owner to decide.
  {name:'m-gray-grandkid-netflix', expected:'gray', transcript:t(['Caller: Hi Grandma, it is Emma.', 'Recipient: Hi darling!', 'Caller: Can you tell me your Netflix password? Mine stopped working.'])}
];
