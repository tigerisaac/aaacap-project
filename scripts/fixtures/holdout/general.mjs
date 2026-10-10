// Held-out probe written after the v2 prompt. Never used to tune wording.
const SCAM = ['block', 'hold'];
export const liveScreeningCases = [
  {name:'h-plumber-late', category:'legit', accept:['approve'], text:"Hi, it's Luis from Sunrise Plumbing. I'm running about twenty minutes behind for the water heater install. Just wanted to give a heads up."},
  {name:'h-school-nurse', category:'legit', accept:['approve'], text:"Hello, this is the nurse's office at Lincoln Elementary. Sophie has a fever and needs to be picked up today. Is a grandparent able to come get her?"},
  {name:'h-church-ride', category:'legit', accept:['approve'], text:"Hi, this is Grace from Saint Paul's. We're organizing rides to the Sunday potluck and wanted to see if she'd like a ride."},
  {name:'h-insurance-agent', category:'legit', accept:['approve'], text:"Hi, it's Steve Miller, her insurance agent. Her home policy renews next month and I'd like to set up a quick review. No rush, any time next week works."},
  {name:'h-league-dues', category:'legit', accept:['approve'], text:"It's Tom from the bowling league. I'm collecting the ten dollars for the end of season party. I can just grab it from her at league on Tuesday."},
  {name:'h-daughter-work-line', category:'legit', accept:['approve'], text:"Mom, it's Sarah. I'm calling from the office line at work. Do you want me to pick up groceries on my way over tonight?"},
  {name:'h-vet-reminder', category:'legit', accept:['approve'], text:"This is a reminder from Maple Animal Hospital that Buddy is due for his yearly vaccines. Please call us to schedule. Press two to repeat this message."},
  {name:'h-senior-center', category:'legit', accept:['approve'], text:"Hello, it's Maria at the Oakwood Senior Center. Just letting everyone know the Thursday lunch is moved to Friday this week."},
  {name:'h-jury-warrant', category:'scam', accept:SCAM, text:"This is Officer Daniels with the county court. She missed jury duty and there is now a warrant. She can pay the fine over the phone today to avoid being arrested."},
  {name:'h-irs-giftcards', category:'scam', accept:SCAM, text:"This is the Internal Revenue Service. She owes back taxes and a lawsuit has been filed. She must pay today with Apple gift cards or local police will come to arrest her."},
  {name:'h-tech-support', category:'scam', accept:SCAM, text:"This is Microsoft Windows support. Her computer has been sending us virus alerts. I need her to go to the computer and open a website I'll give her so we can fix it."},
  {name:'h-sweepstakes-fee', category:'scam', accept:SCAM, text:"Congratulations, this is the prize department at Publishers Clearing House. She has won two and a half million dollars. To release it she just needs to cover the taxes and fees with a cashier's check today."},
  {name:'h-grandson-wire', category:'scam', accept:SCAM, text:"Hi Grandpa, it's your grandson. I'm stuck in Mexico and lost my wallet. Can you send me money through Western Union? Please don't tell Mom."},
  {name:'h-bank-partial-id', category:'scam', accept:SCAM, text:"Hi, this is Lisa from Bank of America security. Before I can discuss the suspicious charges, I need her date of birth and the last four digits of her Social Security number."},
  {name:'h-insurance-robocall', category:'robocall', accept:SCAM, text:"Hi, this is Sarah from Senior Life Benefits. You're pre-approved for a final expense plan with no medical exam. Press one now to speak with a licensed agent."},
  {name:'h-ssa-callback', category:'scam', accept:SCAM, text:"This is an urgent message from the Social Security fraud unit. Call us back immediately at eight eight eight, five five five, zero one four two to avoid legal action against your name."}
].map(c => ({ ...c, expected: c.accept[0] }));
