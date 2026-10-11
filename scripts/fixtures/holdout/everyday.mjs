// Held-out probes written October 11 against v14/v15. Never used to tune wording; if one drives a change, write a fresh set.
// Legitimate calls an older adult in the Austin area gets; scams and robocalls paraphrase documented patterns (FTC, SSA, FBI alerts).
const SCAM = ['block', 'hold'];
export const liveScreeningCases = [
  {name:'e-heb-pharmacy', category:'legit', accept:['approve'], text:"Hi, this is Ana at the H-E-B pharmacy on Burnet. Her husband's insulin came in today. We're open until nine tonight."},
  {name:'e-home-aide-late', category:'legit', accept:['approve'], text:"Hi, it's Tanya with Comfort Home Care, I'm her aide this week. Traffic is bad, so I'll be there closer to ten instead of nine thirty."},
  {name:'e-grandson-spanish', category:'legit', accept:['approve'], text:"Hola abuela, soy Diego. I'm at the store right now, do you need me to bring you anything when I come by later?"},
  {name:'e-auto-shop-ready', category:'legit', accept:['approve'], text:"Hi, this is Ray at Lamar Auto. Her car is ready. The total came to two hundred forty dollars, and she can pay when she picks it up."},
  {name:'e-water-shutoff-notice', category:'legit', accept:['approve'], text:"This is Austin Water with a notice for your street. Water service will be off Tuesday from nine until noon for pipe repairs. No action is needed."},
  {name:'e-discharge-planner', category:'legit', accept:['approve'], text:"Hello, this is Mark, a discharge planner at Saint David's. Her sister Joan is going home tomorrow and listed her as a contact. Could she call the third floor nurses' station when she gets a chance?"},
  {name:'e-old-coworker', category:'legit', accept:['approve'], text:"Hi, this is Betty Lou. We worked together at the post office years ago. Carol gave me this number and I'd just love to catch up."},
  {name:'e-electrician-estimate', category:'legit', accept:['approve'], text:"Hi, Jerry's Electric returning her call about an estimate for the porch light. We could come out Thursday afternoon if that works."},
  {name:'e-branch-card-pickup', category:'legit', accept:['approve'], text:"Hi, it's Monica at the Wells Fargo branch on Lamar. The debit card she ordered is ready to pick up here at the branch. Just bring a photo ID."},
  {name:'e-delivery-gate', category:'legit', accept:['approve'], text:"Hey, Amazon delivery. I've got a package for this address but the gate's locked. Can somebody buzz me in?"},
  {name:'e-neighbor-mail', category:'legit', accept:['approve'], text:"Hi, is Margaret there?",
    followup:"Oh, it's Frank, her neighbor across the street. Some of her mail got delivered to my house by mistake, so I'll drop it by this afternoon."},
  {name:'e-medicare-brace', category:'scam', accept:SCAM, text:"Hi, I'm calling about the free back brace Medicare is offering this month at no cost to her. To get it shipped out, I just need her Medicare number."},
  {name:'e-prize-fee', category:'scam', accept:SCAM, text:"Congratulations, this is the Prize Patrol! She has won two and a half million dollars. To release the prize she just needs to cover the five hundred dollar processing fee with a Green Dot card today."},
  {name:'e-bank-sting', category:'scam', accept:SCAM, text:"This is Detective Ross. I'm working with her bank on an internal fraud case and we need her help catching a teller. She'll withdraw cash at the branch and hand it to one of our agents, and she can't mention this to the bank staff."},
  {name:'e-icloud-robocall', category:'robocall', accept:SCAM, text:"Apple iCloud security alert. Your account has been compromised and your photos may be at risk. Press one now to speak with an Apple security advisor."},
  {name:'e-power-disconnect', category:'scam', accept:SCAM, text:"This is the electric company billing department. There's a past due balance on the account and a technician is on the way to disconnect the power. She can pay right now over the phone with a debit card."},
  {name:'e-grandkid-accident', category:'scam', accept:SCAM, text:"Grandma? It's me. I got in an accident, I'm okay, but I really need your help.",
    followup:"I hit another car and the guy says he'll call the police unless I pay for the damage today. Please don't tell Dad. Can you send it to me on Zelle?"},
  {name:'e-ssa-cola-robocall', category:'robocall', accept:SCAM, text:"This is an important message from the Social Security Administration about your cost of living increase. To confirm your eligibility, press one and verify your Social Security number."},
  {name:'e-windows-teamviewer', category:'scam', accept:SCAM, text:"I'm calling from Windows technical support. Her computer has been sending us error reports. I need her to go to the computer and download a program called TeamViewer so I can fix it."},
  {name:'e-gold-retirement', category:'scam', accept:SCAM, text:"Hi, I'm Jason with Golden Retirement Partners. We're helping retirees in Austin move their savings into gold before the next market crash. Could I set up a quick meeting with her?"},
];
