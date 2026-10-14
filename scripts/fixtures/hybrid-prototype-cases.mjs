// Fresh invented callers for a five-call listening prototype, not a benchmark.
// Follow-ups are spoken only after an audible, relevant question; no silent repair.
export const hybridPrototypeCases = [
  { id: '01-repair-visit', title: 'Repair caller: missing purpose', category: 'ordinary', voice: 'Daniel',
    opening: 'Hello, this is Owen. Could I speak with her, please?',
    answer: 'I am the plumber she booked. I need to move tomorrow\'s repair visit from nine to ten in the morning.',
    questionPattern: 'about|reason|help|calling for|purpose|tell', expected: 'approve' },
  { id: '02-delivery-driver', title: 'Delivery caller: missing identity', category: 'ordinary', voice: 'Samantha',
    opening: 'I am calling to arrange the time for the furniture delivery she booked.',
    answer: 'My name is Dani. I am her delivery driver with Cedar Furniture.',
    questionPattern: 'who|name|company|business|calling from', expected: 'approve' },
  { id: '03-family-plans', title: 'Family caller: missing relationship and purpose', category: 'ordinary', voice: 'Moira',
    opening: 'Hi, this is Leena. Is she available?',
    answer: 'I am her niece. We are planning Sunday lunch, and I wanted to ask what time suits her.',
    questionPattern: 'about|reason|help|calling for|purpose|tell', expected: 'approve' },
  { id: '04-account-pretext', title: 'Account concern: clarification reveals a code request', category: 'harmful', voice: 'Karen',
    opening: 'This is Robin from Meadow Credit Union. I need to speak with her about a security issue on her account.',
    answer: 'I need her to read me the six digit sign in code that was just sent to her phone so I can secure her account.',
    questionPattern: 'need|do|action|about|issue|help|reason', expected: 'block' },
  { id: '05-permit-update', title: 'Government caller: clarification reveals an ordinary update', category: 'ordinary', voice: 'Eddy (English (US))',
    opening: 'This is Alex from the city permits office. There is an issue with her permit that I need to discuss.',
    answer: 'Her inspection has moved to Thursday morning. She just needs to leave the side gate unlocked for the inspector.',
    questionPattern: 'need|do|action|about|issue|help|reason', expected: 'approve' }
];
