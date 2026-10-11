// Voicemail keep-or-remove benchmark: authored transcripts, never real voicemails. Kept under 25 cases.
// Real messages must be kept; scams and junk must be removed. Scam and robocall cases paraphrase documented
// scripts (FTC and SSA alerts, the FTC robocall recordings); real messages are authored hard negatives that
// share scam signals (callbacks, institutions, money, urgency, automation) without a scam request.
// The question wording must stay category-level: never add wording aimed at a case below.
export const voicemailCases = [
  // Real messages
  {name:'v-pharmacy-ready', expected:'keep', transcript:'This is an automated message from Riverside Pharmacy for Margaret Hill. Your prescription is ready for pickup at the Main Street store. If you have questions, please call the store during business hours.'},
  {name:'v-clinic-reschedule', expected:'keep', transcript:'Hi Margaret, this is Kim from Doctor Patel\'s office. Doctor Patel is out on Thursday, so we need to move your appointment. Please give us a call back at the office to pick a new time. Thank you.'},
  {name:'v-grandson-checkin', expected:'keep', transcript:'Hey Grandma, it\'s Tyler. Just calling to say hi, nothing urgent. Call me back when you get a chance. Love you.'},
  {name:'v-neighbor-dog', expected:'keep', transcript:'Hi, it\'s Linda from next door. Your little brown dog got out again, he\'s in my yard, so don\'t worry. I\'ll keep him here until you\'re home.'},
  {name:'v-plumber-late', expected:'keep', transcript:'Hi, this is Dave with Ace Plumbing. I\'m running about an hour behind, so I\'ll be there around three instead of two. Sorry about that.'},
  {name:'v-bank-genuine-alert', expected:'keep', transcript:'This is First Community Bank with a fraud alert about a recent purchase on your debit card. Please call the number on the back of your card to review it. We will never ask for your PIN or a passcode.'},
  {name:'v-hospital-nurse', expected:'keep', transcript:'Hello, this is Karen, a nurse at Saint Mary\'s Hospital. Your husband John came in after a fall this morning. He\'s stable and resting comfortably. Please call the nurses\' station when you can, or come by, he\'s in room four twelve.'},
  {name:'v-church-friend-money', expected:'keep', transcript:'Hi dear, it\'s Dorothy from church. I still have the twenty dollars from the bake sale for you, I\'ll bring it Sunday. See you then.'},
  {name:'v-school-fever', expected:'keep', transcript:'Hi, this is the front office at Lincoln Elementary calling for Emma\'s grandmother. Emma has a fever and needs to be picked up. Please call the office as soon as you can.'},
  {name:'v-insurance-renewal', expected:'keep', transcript:'Hi Margaret, it\'s Steve Lopez, your State Farm agent. Your home policy renews next month and I wanted to go over a couple of changes with you. Give me a call at the office when it\'s convenient.'},
  {name:'v-daughter-thanksgiving', expected:'keep', transcript:'Mom, it\'s me. Call me back when you get this, I want to figure out Thanksgiving. Love you.'},
  {name:'v-unnamed-callback', expected:'keep', transcript:'Hi, it\'s me, call me back when you get a chance. Bye.'},
  // Scams
  {name:'v-irs-warrant', expected:'remove', transcript:'This message is from the Internal Revenue Service. A lawsuit has been filed against you for tax fraud and an arrest warrant will be issued. Call us back immediately at the number provided to resolve this before officers are sent to your address.'},
  {name:'v-ssa-suspended', expected:'remove', transcript:'This is the Social Security Administration. Your Social Security number has been suspended because of suspicious activity. To reactivate it and avoid legal action, call our department back right away.'},
  {name:'v-grandson-trouble', expected:'remove', transcript:'Grandma, it\'s me, I\'m in really big trouble. Please call me back at this number as soon as you can. And please don\'t tell Mom, okay?'},
  {name:'v-amazon-iphone', expected:'remove', transcript:'Hello, this is Amazon. An order for an Apple iPhone for one thousand two hundred dollars was placed on your account. If you did not authorize this purchase, call us back immediately to cancel it and get a refund.'},
  {name:'v-tech-support', expected:'remove', transcript:'This is Microsoft technical support. We have detected a virus on your computer that is stealing your banking information. Call us back right away so a technician can connect to your computer and remove it.'},
  {name:'v-bank-locked-number', expected:'remove', transcript:'This is the security department of your bank. Your account has been locked because of unusual activity. To unlock it, call us back at eight eight eight, five five five, zero one nine nine and verify your account number and PIN.'},
  // Junk
  {name:'v-car-warranty', expected:'remove', transcript:'We\'ve been trying to reach you concerning your car\'s extended warranty. This is your final courtesy call before we close your file. Press one now or call us back to speak with a warranty specialist.'},
  {name:'v-medicare-plans', expected:'remove', transcript:'Hi, this is Jenny with Senior Benefits. Open enrollment is here and you may qualify for extra Medicare benefits at no cost. Call us back today to see what you\'re eligible for.'},
  {name:'v-political-survey', expected:'remove', transcript:'Hi, this is Sam with Citizens for a Better Texas. We\'re conducting a short survey about the upcoming election. Please call us back to share your views.'},
  {name:'v-solar', expected:'remove', transcript:'Homeowners in your area are now eligible for free solar panels under a new state program. Call back today to schedule your free home assessment before the program ends.'},
];
