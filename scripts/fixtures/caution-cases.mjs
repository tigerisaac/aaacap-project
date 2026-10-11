// Caution-mode checks: screening in the 24 hours after Shield stopped a scam for this person.
// Run with --caution. Written after the caution wording, and not used to tune it; if a case drives a wording
// change, write fresh cases. All authored, no real calls.
// `callback` cases refer to an earlier call. The owner's plan holds them for 24 hours whether the caller is a
// scammer trying again or a real person whose call dropped; the second kind is the accepted cost, so report it.
// `legit` cases mention earlier contact that isn't a call, and must still be offered.
const HELD = ['hold', 'block'];
export const liveScreeningCases = [
  {name:'bank-security-callback', category:'callback', accept:HELD, source:'authored: impersonator calling back after a block',
    text:'Hi, this is Mark again from the bank\'s security department. We got disconnected a few minutes ago, and I need to finish going over the charges on her account with her.',
    followup:'I just need a minute with her to confirm a couple of recent purchases. Nothing to worry about.'},
  {name:'grandchild-call-dropped', category:'callback', accept:HELD, source:'authored: family voice calling back with an ordinary reason',
    text:'Grandma, it\'s me again, sorry, the call dropped. Can you come pick me up from the mall later?'},
  {name:'benefits-follow-up', category:'callback', accept:HELD, source:'authored: agency follow-up that only informs',
    text:'Hello, this is David with the benefits office, following up on the call she got from us this morning. I just wanted to let her know her new card is on its way.'},
  {name:'pharmacy-cut-off', category:'callback', accept:HELD, source:'authored: routine business whose earlier call was cut off',
    text:'Hi, it\'s Amy from Riverside Pharmacy calling back, we got cut off earlier. Her prescription is ready for pickup whenever she can come by.'},
  {name:'friend-cut-off', category:'callback', accept:HELD, source:'authored: friend whose call dropped (accepted cost)',
    text:'Hi, it\'s Dorothy again, sorry, we got cut off. I was just telling her about the church lunch on Sunday.'},
  {name:'returning-missed-call', category:'callback', accept:HELD, source:'authored: unknown caller returning a call',
    text:'Hi, I\'m returning a missed call from this number. This is Steve from Lakeside Auto, about the car.'},
  {name:'officer-callback-gift-cards', category:'callback', accept:HELD, source:'authored: callback that also makes a block request',
    text:'This is Officer Grant calling back about the warrant. She has to pay the fine today with gift cards or she will be arrested.'},
  {name:'clinic-test-follow-up', category:'legit', accept:['approve'], source:'authored: follows up on a test, not a call',
    text:'Hi, this is Lisa, a nurse at Doctor Lee\'s office. I\'m following up on her blood test from last week. Everything looked normal, and she doesn\'t need to do anything.'},
  {name:'appointment-booked-last-week', category:'legit', accept:['approve'], source:'authored: refers to an earlier booking',
    text:'Hello, this is Carlos from Sunrise Dental. She booked a cleaning with us last week, and I\'m calling to confirm it for Tuesday at ten.'},
].map(c => ({ ...c, expected: c.accept[0] }));
