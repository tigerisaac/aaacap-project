// v16 owner decision: family-only openers are deliberately offered, with harmful requests deferred to
// connected-call protection. These two are not "scams stopped" or proof of a legitimate caller.
const NOT_CONNECTED = ['block', 'hold', 'continue'];
export const liveScreeningCases = [
  {name:'ft-scam-little-trouble', category:'deferred', accept:['approve'], text:"Grandpa, it's Ethan. I'm okay, but I got into a little trouble. Can I talk to him for a sec?", followups:["I just need to talk to him, it's kind of private, please."]},
  {name:'ft-scam-mom-situation', category:'deferred', accept:['approve'], text:"Hi, it's her granddaughter Chloe. I'm in a bit of a situation and I really need to talk to Grandma right now.", followups:["I can't really say, it's embarrassing, I just need her."]},
  {name:'ft-scam-lawyer-grandson', category:'scam', accept:NOT_CONNECTED, text:"Hello, my name is Mark Ellis, I'm an attorney representing her grandson. He asked me to call her about his situation."},
  {name:'ft-legit-flat-tire', category:'legit', accept:['approve'], text:"Grandpa, it's Ethan. I'm okay, but I got a flat tire on the highway. Can he come help me or call a tow truck?", followups:["I just need help with the car, I'm safe."]},
  {name:'ft-legit-sick-at-school', category:'legit', accept:['approve'], text:"Hi Grandma, it's Chloe. I'm not feeling well and the school nurse said I can go home if someone picks me up.", followups:["I just need a ride home from school."]},
  {name:'ft-legit-advice', category:'legit', accept:['approve'], text:"Hey Grandpa, it's Ethan. I got into a little trouble at school today and I wanted to ask his advice before I tell Mom.", followups:["I just want to talk it through with him."]}
].map(c => ({ ...c, expected: c.accept[0] }));
