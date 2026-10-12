// Conditional forwarding codes by carrier (docs/CARRIERS.md). A carrier is offered only after one supervised test on
// a real line from it; until then `verified` is false and Shield shows no codes for it.

export type CarrierId = 'tello' | 'tmobile' | 'att' | 'verizon';
type Carrier = { name: string; verified: boolean; activation: (digits: string) => string[] };
const gsm = (digits: string) => ['61', '67', '62'].map(condition => `**${condition}*${digits}#`);

export const CARRIERS: Record<CarrierId, Carrier> = {
  // Verified October 10, 2026: Tello confirmed registration for all three conditions.
  tello: { name: 'Tello', verified: true, activation: gsm },
  // Shared Diversion identity and overlap verified October 12; each person's setup still requires a nonce probe.
  tmobile: { name: 'T-Mobile', verified: true, activation: gsm },
  verizon: { name: 'Verizon', verified: false, activation: digits => [`*71${digits.replace(/^1/, '')}`] },
  att: { name: 'AT&T', verified: false, activation: gsm }
};
export const carrierIds = Object.keys(CARRIERS) as CarrierId[];
export const carrierFor = (id: unknown): Carrier | undefined => typeof id === 'string' && id in CARRIERS ? CARRIERS[id as CarrierId] : undefined;

/** Codes that forward unanswered, busy and unreachable calls to `shieldNumber`. Empty for an unverified carrier. */
export function activationCodes(carrier: unknown, shieldNumber: string) {
  const c = carrierFor(carrier);
  return c?.verified ? c.activation(shieldNumber.replace(/^\+/, '')) : [];
}
