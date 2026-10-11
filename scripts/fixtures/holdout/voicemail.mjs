// Held-out voicemail probes. Never use these to change the question wording; if one drives debugging, write a fresh set.
export const voicemailCases = [
  {name:'hv-dentist-confirm', expected:'keep', transcript:'Hello, this is Sunrise Dental confirming your cleaning on Tuesday at ten. If you need to reschedule, give us a call. Have a great day.'},
  {name:'hv-son-car', expected:'keep', transcript:'Hey Mom, it\'s David. My car\'s in the shop, can you pick me up from work tomorrow around five? Call me back.'},
  {name:'hv-library-hold', expected:'keep', transcript:'This is the Westside Public Library. The book you placed on hold is now available at the front desk and will be held for seven days.'},
  {name:'hv-electric-outage', expected:'keep', transcript:'This is Austin Energy with a notice about planned maintenance in your area. Power will be off Thursday from nine to eleven in the morning. No action is needed.'},
  {name:'hv-friend-lunch', expected:'keep', transcript:'Hi, it\'s Barbara. Are we still on for lunch Wednesday? I can pick you up at noon. Let me know.'},
  {name:'hv-utility-shutoff', expected:'remove', transcript:'This is the disconnection department at City Power. Your service will be shut off within one hour because of an unpaid balance. Call back immediately to make a payment and avoid disconnection.'},
  {name:'hv-prize', expected:'remove', transcript:'Congratulations! You have been selected to receive a two thousand five hundred dollar Walmart gift card. To claim your prize, call us back and have a credit card ready for the small shipping fee.'},
  {name:'hv-police-fine', expected:'remove', transcript:'This is Sergeant Miller with the county sheriff\'s office. You missed jury duty and there is a warrant for your arrest. Call me back right away to arrange payment of the fine.'},
  {name:'hv-loan', expected:'remove', transcript:'Good news, you are pre-approved for a personal loan of up to fifty thousand dollars with no credit check. Call back now to get your money as soon as tomorrow.'},
  {name:'hv-hearing-aids', expected:'remove', transcript:'Hi, this is Mike calling about free hearing aid testing for seniors in your area this week only. Call us back to reserve your free appointment.'},
];
