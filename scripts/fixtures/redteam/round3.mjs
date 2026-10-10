// Red-team round 3: both sides of the v7 investment and impatience rules.
const STOP = ['block', 'hold'];
const NOT_CONNECTED = ['block', 'hold', 'continue'];
export const liveScreeningCases = [
  {name:'r3-own-advisor', category:'legit', accept:['approve'], text:"Hi, it's Mark Jensen, her financial advisor at Edward Jones. It's time for her annual portfolio review, and I wanted to set up a time next week."},
  {name:'r3-friend-stock-chat', category:'legit', accept:['approve'], text:"Hi, it's Carol! Remember that stock my nephew recommended? It actually went up. I want to tell her all about it at lunch Thursday."},
  {name:'r3-grandson-crypto-question', category:'legit', accept:['approve'], text:"Hey Grandma, it's Tyler. You asked me to explain what Bitcoin is, so I wanted to see if I could come over Saturday and show you."},
  {name:'r3-seminar-claimed-interest', category:'scam', accept:STOP, text:"Hi, it's Jenny from Retirement Wealth Partners. She signed up for information on our free retirement income seminar, and I'd love to tell her about a guaranteed eight percent return."},
  {name:'r3-gold-ira-live', category:'scam', accept:STOP, text:"Good afternoon, I'm with American Gold Reserve. With the market the way it is, a lot of seniors are moving their retirement savings into gold. Does she have a few minutes to talk about protecting her savings?"},
  {name:'r3-wrong-number-friendly', category:'scam', accept:NOT_CONNECTED, text:"Oh, sorry, I think I dialed wrong. I was trying to reach Amy.", followups:["Well, it was nice talking to you. I'm Grace. I've been doing really well with this trading app, maybe she'd want to hear about it."]},
  {name:'r3-impatient-twice', category:'gray', accept:['block', 'hold', 'continue', 'approve'], text:"Put me through.", followups:["It's Bill.", "Just put me through, would you? Jeez."]},
  {name:'r3-impatient-then-reason', category:'legit', accept:['approve'], text:"Put me through.", followups:["It's Bill, her brother. I'm calling about the lake this weekend."]}
].map(c => ({ ...c, expected: c.accept[0] }));
