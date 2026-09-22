import { connect, firestore, documentRoot, fields } from './firebase-client.mjs';
await connect();
const now = Date.now();
await firestore().patch(`${documentRoot}/trial/control`, { fields: fields({ enabled: true, startedAt: now, expiresAt: now + 3600_000, used: 0 }) });
console.log('Opened one private 60-minute trial window, limited to 10 calls from the existing verified phone.');
