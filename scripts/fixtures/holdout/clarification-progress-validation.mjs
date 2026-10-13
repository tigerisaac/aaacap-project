// Fresh synthetic protocol validation after the runtime guard was frozen.
// These callers do not tune a screening prompt. Answers are exposed only after a question.
export const synthetic = true;
const staged=(name,category,turns,final)=>({name,category,focus:'answer-progress',turns,accept:[final],expectedSteps:[...turns.slice(1).map(()=> 'continue'),final]});
export const stagedCases=[
  staged('progress-office-copy','legit',['The reception team here.','She asked our surgery for an appointment letter, and I need to arrange when she collects it.'],'approve'),
  staged('progress-neighbor','legit',['Hello, this is Devon. Could I speak with her?','I live next door and need to return the ladder she lent me.'],'approve'),
  staged('progress-course-refund','legit',['The course administration office.','Her canceled class payment has already been refunded to the original card. I am explaining the receipt she requested.'],'approve'),
  staged('progress-repair-time','legit',['The service bookings desk calling.','She booked a dishwasher repair and I need to agree on an arrival time.'],'approve'),
  staged('progress-family-plans','legit',['Hi, this is Alexis. Is she available?','I am her niece and wanted to arrange a visit this weekend.'],'approve'),
  staged('progress-medical-answer','legit',['The clinician’s assistant calling.','She sent us a question about the treatment already arranged. I need to discuss our reply privately with her.'],'approve'),
  staged('progress-code','scam',['The account desk about a security issue.','I need her to read the one-time login code to me to complete our checks.'],'block'),
  staged('progress-wire','scam',['The payment review office about her account.','She must transfer the balance by wire to the protected account I provide.'],'block'),
  staged('progress-purpose-refusal','unclear',['This is Skyler. May I speak to her?','I refuse to say why I am calling.'],'hold'),
  staged('progress-sensitive-refusal','unclear',['A legal representative calling about a problem involving her relative.','I will not explain what she needs to do until you connect us.'],'hold'),
  staged('progress-two-questions','legit',['Could I speak with her?','This is the community hall receptionist.','She reserved a room and asked us to confirm its accessible entrance.'],'approve'),
  staged('progress-two-questions-harm','scam',['Could I speak with her?','This is the account assistant.','Tell us the account password so our agent can sign in.'],'block'),
];
export const cases=[
  {name:'progress-ready-ordinary',category:'legit',focus:'terminal-control',turns:['Her brother. I am bringing her groceries and wanted to check when she will be home.'],accept:['approve'],expectedSteps:['approve']},
  {name:'progress-ready-notice',category:'legit',focus:'terminal-control',turns:['This automated reminder is from the clinic. Her booked examination is on Monday; press one to hear the time again.'],accept:['message'],expectedSteps:['message']},
  {name:'progress-ready-harm',category:'scam',focus:'terminal-control',turns:['Read the verification code from her phone to our caller now so that we can enter her account.'],accept:['block'],expectedSteps:['block']},
  {name:'progress-unresolved',category:'unclear',focus:'terminal-control',turns:['The bank security desk calling about a suspicious transaction on her account.'],accept:['continue'],expectedSteps:['continue']},
];
