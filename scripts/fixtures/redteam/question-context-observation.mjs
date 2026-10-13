// Synthetic transport/format diagnostic, not an unseen policy benchmark.
// Each snapshot and staged pair contains byte-identical cumulative caller text.
// Native history adds only the model's question and tool interaction; no future answer
// reaches a staged caller after a terminal decision. No prompt changes use outcomes.
export const synthetic = true;
const pairs = [
  ['booking', 'legit', ['The booking desk.', 'Her reserved meeting room has moved to the ground floor.'], 'approve'],
  ['lesson', 'legit', ['The class coordinator.', 'The language lesson she booked will start later tomorrow.'], 'approve'],
  ['care', 'legit', ['Her clinic coordinator.', 'We need to move her scheduled review to the following morning.'], 'approve'],
  ['refund', 'legit', ['The accounts desk about money for her.', 'Her canceled art class was refunded to the original card yesterday. No action is needed.'], 'approve'],
  ['identifier', 'scam', ['The records desk.', 'She must read her entire government identity number to us now.'], 'block'],
];
export const cases = pairs.map(([id, category, turns, action]) => ({ name: `context-snapshot-${id}`, pair: id, category, focus: 'snapshot', turns: [turns.join(' ')], accept: [action], expectedSteps: [action] }));
cases.push(
  { name: 'context-recorded-booking', category: 'legit', focus: 'notice-control', turns: ['Recorded notice from the booking desk. Her reserved meeting room has moved to the ground floor.'], accept: ['message'], expectedSteps: ['message'] },
  { name: 'context-recorded-lesson', category: 'legit', focus: 'notice-control', turns: ['Automated message from the class coordinator. The language lesson she booked will start later tomorrow.'], accept: ['message'], expectedSteps: ['message'] },
);
export const stagedCases = pairs.map(([id, category, turns, action]) => ({ name: `context-staged-${id}`, pair: id, category, focus: 'native-history', turns, accept: [action], expectedSteps: ['continue', action], questionRubric: { missing: id === 'refund' ? 'basis-and-action' : 'purpose', noSecrets: true, noRepeatedKnownFacts: true, noConnectionPromise: true } }));
