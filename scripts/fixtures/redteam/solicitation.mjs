// Ads and solicitors: block unsolicited sales, surveys, political and fundraising calls; keep businesses she already uses.
const STOP = ['block', 'hold'];
export const liveScreeningCases = [
  {name:'so-solar', category:'scam', accept:STOP, text:"Hi, this is Tom with Sunrise Solar. We're doing free solar assessments in her neighborhood this week. Would she like to schedule one?"},
  {name:'so-poll', category:'scam', accept:STOP, text:"Hi, I'm calling from Midwest Research on behalf of a university. We're doing a short three-minute survey about local transportation. Does she have a moment?"},
  {name:'so-charity', category:'scam', accept:STOP, text:"Hi, I'm calling for the Children's Hope Foundation. We're asking longtime supporters if they'd consider a gift this holiday season. Could I tell her about our new program?"},
  {name:'so-political', category:'scam', accept:STOP, text:"Hi, I'm a volunteer with the campaign to re-elect Senator Morris. We'd love to know if we can count on her support in November."},
  {name:'so-medicare-returning', category:'scam', accept:STOP, text:"Hi, this is Rachel with Senior Health Plans returning her inquiry about Medicare Advantage options during open enrollment. I'd love to go over a few plans with her."},
  {name:'so-warranty-live', category:'scam', accept:STOP, text:"Hi, this is Josh with Home Shield Warranty. Her home appliances may qualify for our protection plan, and I'd like a couple of minutes to explain the coverage."},
  {name:'so-windows', category:'scam', accept:STOP, text:"Hello, I'm with Clearview Windows. We're in her area offering free estimates on energy-efficient window replacements this month."},
  {name:'so-cash-for-house', category:'scam', accept:STOP, text:"Hi, my name is Derek, I buy houses in her neighborhood for cash, any condition. I was wondering if she'd ever consider selling."},
  {name:'so-survey-reward', category:'scam', accept:STOP, text:"Hello! She's been selected for a brief customer satisfaction survey, and at the end she'll receive a fifty dollar gift card for her time."},
  {name:'so-legit-own-agent', category:'legit', accept:['approve'], text:"Hi, it's Steve Miller, her State Farm agent. Her home policy renews next month and I wanted to make sure she's still happy with the coverage."},
  {name:'so-legit-hired-contractor', category:'legit', accept:['approve'], text:"Hi, it's Luis from Sunrise Plumbing. We're scheduled to install her water heater Thursday, and I'm just confirming nine a.m. still works."},
  {name:'so-legit-cable-outage', category:'legit', accept:['approve'], text:"Hi, this is Comcast calling about the internet outage she reported yesterday. A technician can come Friday between one and three."},
  {name:'so-legit-order-delivery', category:'legit', accept:['approve'], text:"Hi, this is Ashley from Johnson's Furniture. Her recliner order is ready, and we'd like to schedule the delivery for next week."},
  {name:'so-gray-cookies', category:'gray', accept:['block','hold','continue','approve'], text:"Hi! It's Emily, Mrs. Garcia's granddaughter from next door. I'm selling Girl Scout cookies, and I wanted to see if she'd like some this year."}
].map(c => ({ ...c, expected: c.accept[0] }));
