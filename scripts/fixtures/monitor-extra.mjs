// Development cases retired from monitor-cases.mjs to keep the main set under 25. Not held out: they shaped earlier prompts.
const t = lines => lines.join('\n');
export const monitorCases = [
  // Gray: a real relative asking for a password. Not scored; v1 intervened 3/3.
  {name:'m-gray-grandkid-netflix', expected:'gray', transcript:t(['Caller: Hi Grandma, it is Emma.', 'Recipient: Hi darling!', 'Caller: Can you tell me your Netflix password? Mine stopped working.'])},
  {name:'m-neighbor-borrow', expected:'continue', transcript:t(['Caller: Hi hon, it is Barb next door. Could I borrow twenty dollars until Friday?', 'Recipient: Of course, come by after lunch.', 'Caller: Thank you, I will pop over at one.'])},
  {name:'m-theater-payback', expected:'continue', transcript:t(['Caller: The theater tickets were forty dollars each.', 'Recipient: I will pay you back when we meet there Saturday.', 'Caller: Sounds good, no rush at all.'])},
  {name:'m-medicare-number', expected:'intervene', transcript:t(['Caller: We are updating your Medicare file for the new year.', 'Recipient: Okay.', 'Caller: I just need you to read me your Medicare number to confirm it.'])},
  {name:'m-romance-zelle', expected:'intervene', transcript:t(['Caller: I miss you so much, I cannot wait to finally meet you.', 'Recipient: Me too.', 'Caller: I just need two thousand for the plane ticket. Could you send it through Zelle tonight?'])},
  {name:'m-benign-then-pivot', expected:'intervene', transcript:t(['Caller: The weather has been lovely, has it not?', 'Recipient: It has, I was in the garden all morning.', 'Caller: Wonderful. Oh, while I have you, a little code just came to your phone, could you read that to me?'])},
  {name:'u-scam-warning', expected:'continue', transcript:t(['Speaker: Someone called pretending to be my bank and asked me to read them a code.', 'Speaker: Oh no, did you?', 'Speaker: No, I hung up. Never read anyone a code, okay?'])},
];
