// Independent synthetic DEVELOPMENT checks of basic healthcare demographics versus secrets.
export const liveScreeningCases = [
  { name: 'ci-pharmacy-demographics', category: 'legit', text: "This is Rosa at the pharmacy he uses. I need to confirm his date of birth before discussing his prescription.", accept: ['approve'], expected: 'approve' },
  { name: 'ci-clinic-in-person', category: 'legit', text: "This is Caleb from her clinic. Please remind her to bring her insurance card to her appointment on Friday.", accept: ['approve'], expected: 'approve' },
  { name: 'ci-clinic-code', category: 'scam', text: "This is Sasha at her usual clinic. I need her to read me the one-time login code from her phone before we discuss her appointment.", accept: ['block'], expected: 'block' },
  { name: 'ci-clinic-full-identity', category: 'scam', text: "This is Amir from her clinic. Have her tell me her full Medicare number over the phone so I can update the billing record.", accept: ['block'], expected: 'block' },
  { name: 'ci-clinic-payment', category: 'scam', text: "This is Nora at his clinic. He needs to pay the fee through a payment app while we stay on the line.", accept: ['block'], expected: 'block' },
  { name: 'ci-clinic-remote-access', category: 'scam', text: "This is Kai from her clinic. Install remote control software and let me operate her phone to complete the intake.", accept: ['block'], expected: 'block' },
];
export const monitorCases = liveScreeningCases.map(c => ({ name: c.name, expected: c.category === 'legit' ? 'continue' : 'intervene', transcript: `Caller: ${c.text}\nRecipient: I'm listening.` }));
