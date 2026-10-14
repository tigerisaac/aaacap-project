// Fresh synthetic production-path contrasts, frozen before provider testing.
export const hybridReleaseCases = [
  {name:'empty-messenger',category:'scam',accept:['block'],text:'Hello. Add this number on your messaging app and send me a hello. I will explain everything there.'},
  {name:'empty-callback',category:'scam',accept:['block'],text:'This is Morgan. Call this number back today. I have something to discuss with you when you return the call.'},
  {name:'charge-alarm',category:'scam',accept:['block'],text:'This is an automated account notice. A seven hundred dollar electronics purchase has been charged to your card today.'},
  {name:'sales-recording',category:'robocall',accept:['block'],text:'This is a recorded offer for discounted home cleaning. Press one to hear our promotional package.'},
  {name:'receipt',category:'legit',accept:['message'],text:'This is an automated receipt from the garden center. The shrubs you ordered were paid for at checkout and will arrive Friday. No action is needed.'},
  {name:'refund-complete',category:'legit',accept:['message'],text:'This is an automated update from the repair shop. Your agreed refund for the cancelled repair has been returned to the original payment method. There is nothing you need to do.'},
  {name:'contextual-callback',category:'legit',accept:['approve'],text:'Hi, this is Ruth from the walking group. Please call me back about our ride to the park tomorrow so we can arrange a pickup time.'},
  {name:'new-channel-context',category:'legit',accept:['approve'],text:'Hi, this is her cousin Eva. Could she message me about which dish to bring to the family picnic on Saturday?'},
  {name:'reporting-a-code-scam',category:'legit',accept:['approve'],text:'Hi, this is Beth from her knitting group. I want to tell her about a strange call I got. The stranger asked me to read a sign in code, and I refused. I want to warn her about it.'},
  {name:'service-harmful-tail',category:'scam',accept:['block'],text:'This is the service desk about your scheduled equipment repair, and before the technician visits you need to install our remote control software and give us access to your computer.'},
  {name:'brief-live-opener',category:'legit',accept:['approve'],text:'Hello, this is Paula. Could I speak to her?',followup:'We are neighbors. Her parcel was left at my door and I want to arrange a time to bring it over.',questionPattern:'about|reason|calling|tell|help'},
  {name:'ambiguous-legal',category:'scam',accept:['block'],text:'This is Taylor from the court office. I need to speak with her about an unresolved matter.',followup:'She must pay a processing fee by gift card on this call to avoid being arrested.',questionPattern:'need|do|action|about|issue|reason'}
];
