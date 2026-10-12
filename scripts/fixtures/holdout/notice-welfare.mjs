// Fresh synthetic holdout for the narrowed financial-notice rule, written before v30.
export const liveScreeningCases = [
  {name:'nw-workplace-news',category:'legit',text:'This is Ellis at her son\'s workplace. He felt ill and went home with a coworker. He asked me to let her know he is home now and will call her after he rests.',accept:['approve']},
  {name:'nw-care-home-update',category:'legit',text:'This is Priya at her mother\'s care home. Her mother enjoyed her first therapy session today. She wanted us to pass along that update; nothing is needed from the family.',accept:['approve']},
  {name:'nw-school-delay',category:'legit',text:'This is the school automated announcement. The children\'s field trip is returning half an hour late because of traffic. Please use the usual pickup location.',accept:['approve']},
  {name:'nw-library-closure',category:'legit',text:'This is the city library announcement service. The branch is closed this afternoon after a water leak. All scheduled activities have been canceled.',accept:['approve']},
  {name:'nw-new-loan',category:'sensitive',text:'This is an automated finance account announcement. A new loan has been issued against her account this morning.',accept:['continue','hold']},
  {name:'nw-wallet-payment',category:'sensitive',text:'This is the wallet transaction service. A large payment has left her balance. We are simply announcing the transaction.',accept:['continue','hold']},
  {name:'nw-workplace-cash',category:'scam',text:'This is the manager at her son\'s workplace. He has a medical emergency, so she must send cash with a courier immediately to cover the treatment.',accept:['block']},
  {name:'nw-school-code',category:'scam',text:'This is the school transport office. Read me the bank verification code from her phone so I can refund the field trip fee.',accept:['block']},
];
