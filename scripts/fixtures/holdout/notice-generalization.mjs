// Fresh synthetic validation, frozen before changing the notice policy. Never tune on results.
export const liveScreeningCases = [
  {name:'ng-visit-rescheduled',category:'legit',text:'This is the automated home-care scheduler. Her nurse will arrive at eleven instead of ten tomorrow.',accept:['approve']},
  {name:'ng-refund-received',category:'legit',text:'This is Luca at the furniture store. The return she brought in yesterday is complete and the refund has gone back to her original payment method. She does not need to do anything.',accept:['approve']},
  {name:'ng-rent-statement',category:'legit',text:'This is the apartment office. Her monthly rent statement is available in the resident portal she normally uses. We are not taking payment by phone.',accept:['approve']},
  {name:'ng-community-cancellation',category:'legit',text:'This is the senior center automatic announcement. The afternoon exercise session is canceled because of the storm.',accept:['approve']},
  {name:'ng-insurance-paperwork',category:'legit',text:'This is the agent handling her current home insurance claim. I need to arrange a time to inspect the damage and explain the written estimate.',accept:['approve']},
  {name:'ng-security-self-service',category:'legit',text:'This is the email account security team. We detected a password change. Please hang up and review it in your existing account settings. We do not need any information on this call.',accept:['approve']},
  {name:'ng-friend-notification',category:'legit',text:'This is her friend Avery. I got an alarming automatic renewal message and I would like to talk about it over lunch.',accept:['approve']},
  {name:'ng-train-receipt',category:'legit',text:'This is the station ticket office. The receipt for the train tickets she bought at our counter is ready to collect with her tickets.',accept:['approve']},
  {name:'ng-new-credit-line',category:'sensitive',text:'This is an automatic lending account notice. A credit agreement has been opened in her name today.',accept:['continue','hold']},
  {name:'ng-purchase-warning',category:'sensitive',text:'This is the department store account service. A high-value purchase has appeared on her account this morning.',accept:['continue','hold']},
  {name:'ng-pending-withdrawal',category:'sensitive',text:'This is the account notification desk. There is a pending withdrawal of her savings. That is all this notification says.',accept:['continue','hold']},
  {name:'ng-account-investigation',category:'sensitive',text:'This is the automated marketplace investigation line. Her account has been flagged for a fraudulent order.',accept:['continue','hold']},
  {name:'ng-utility-collection',category:'scam',text:'This is a utility account notice. To avoid losing power she must buy a prepaid payment card and read its number to us.',accept:['block']},
  {name:'ng-shipping-access',category:'scam',text:'This is the parcel alert desk. To release the parcel, approve the remote-access request on her tablet so we can correct the address.',accept:['block']},
  {name:'ng-tax-keypress',category:'robocall',text:'Automated tax notice. Enforcement has been authorized on her account. Press two now to speak to the officer and stop it.',accept:['block']},
  {name:'ng-refund-pin',category:'scam',text:'This is the ticket refund office. Give me the PIN for her bank card so I can return the fare.',accept:['block']},
];
