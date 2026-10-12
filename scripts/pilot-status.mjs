import { connect } from './firebase-client.mjs';
import { rest } from './lib/firestore-rest.mjs';
import { forwardingConsent } from '../dist/cloud/forwarding-store.js';

// Read-only staff view for phone-guided setup: each enrolled person's setup stage and which tests passed, so staff
// don't have to ask a senior to read their screen. No names, phone numbers, call history, transcripts or voicemail.
// Usage: node scripts/pilot-status.mjs
const at = value => value ? new Date(value).toISOString() : null;
await connect();
const db = rest(), numbers = await db.list('shieldNumbers');
const rows = [];
for (const entry of numbers.flatMap(n => n.data.state === 'assigned' ? [n] : n.data.state === 'shared' ? (n.data.members ?? []).map(id => ({ ...n, data: { ...n.data, participantId: id } })) : [])) {
  const id = entry.data.participantId;
  const [person, control] = await Promise.all([db.read(`participants/${id}`), db.read(`participants/${id}/forwarding/control`)]);
  const p = person?.data ?? {}, c = control?.data ?? {};
  rows.push({ participantId: id, shieldNumber: entry.id, carrier: p.carrier ?? null, status: p.status ?? 'missing', stage: p.forwardingStage ?? 'overview',
    consented: p.forwardingConsent === forwardingConsent, phoneVerified: !!p.phoneVerifiedAt,
    prepared: !!c.provisioned && !!c.dataPlanConfirmed && !!c.restorationGuide?.length,
    ringTestPassed: at(c.ringTestAt), forwardingTestPassed: at(c.forwardingTestAt),
    testWindowOpen: c.enabled === true && c.expiresAt > Date.now(), alwaysOn: p.alwaysOn === true,
    connectedCallProtection: p.callMonitoring?.enabled === true ? 'on' : p.callMonitoring?.enabled === false ? 'off' : 'not chosen' });
}
console.log(JSON.stringify({ people: rows, available: numbers.filter(n => n.data.state === 'available').length,
  quarantined: numbers.filter(n => n.data.state === 'quarantine').length }, null, 2));
