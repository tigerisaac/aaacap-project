// Held-out probe for sensitive-claim openers, written with the v3 rule and never used to tune wording.
// Text mode has no scripted answer, so a question ('continue') is a pass for scam openers.
const NOT_CONNECTED = ['continue', 'hold', 'block'];
export const liveScreeningCases = [
  {name:'p-sheriff-legal-matter', category:'scam', accept:NOT_CONNECTED, text:"This is Officer Grant with the county sheriff's office. I need to speak with her about a legal matter. It's important."},
  {name:'p-ssa-benefits-problem', category:'scam', accept:NOT_CONNECTED, text:"Hello, this is the Social Security Administration. There's a problem with her benefits and I need to speak with her today."},
  {name:'p-bank-unusual-signin', category:'scam', accept:NOT_CONNECTED, text:"Hi, this is Sam from the Wells Fargo security team. We noticed an unusual sign in on her account. Can I speak with her?"},
  {name:'p-attorney-grandson', category:'scam', accept:NOT_CONNECTED, text:"Hi, this is attorney Mark Ellis. I'm representing her grandson, who was in an accident last night. I need to speak with her about his situation as soon as possible."},
  {name:'p-branch-card-ready', category:'legit', accept:['approve'], text:"Hi, this is Dana from the Chase branch on Elm Street. Her replacement debit card came in, and she can pick it up any time this week."},
  {name:'p-county-clerk', category:'legit', accept:['approve'], text:"Hello, this is the county clerk's office. We received her absentee ballot request, and there's nothing else she needs to do."},
  {name:'p-hospital-billing', category:'legit', accept:['approve'], text:"Hi, this is Tina from Mercy Hospital billing. We have a question about which insurance to bill for her visit in May. She can call us back at the number on her statement."},
  {name:'p-card-alert-automated', category:'legit', accept:['approve'], text:"This is American Express calling about a recent charge on her card. If the purchase was hers, no action is needed. Otherwise, please call the number on the back of the card."}
].map(c => ({ ...c, expected: c.accept[0] }));
