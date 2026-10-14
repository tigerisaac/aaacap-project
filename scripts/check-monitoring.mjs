// Operator-only view of connected-call protection for the latest forwarded calls.
// Prints states, event kinds, sizes and error counts — never transcripts, phone numbers or audio.
import { Client, connect, firestore, documentRoot, project } from './firebase-client.mjs';
try {
  await connect();
  const decode = v => 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]))
    : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(decode) : 'integerValue' in v ? Number(v.integerValue) : v.stringValue ?? v.booleanValue ?? v.doubleValue ?? null;
  const wanted = ['id', 'state', 'outcome', 'reason', 'createdAt', 'acceptedAt', 'monitoringStartedAt', 'monitorIntervenedAt', 'monitorConcern', 'events'];
  const calls = (await firestore().post(`${documentRoot}:runQuery`, { structuredQuery: { from: [{ collectionId: 'callSessions' }],
    select: { fields: wanted.map(fieldPath => ({ fieldPath })) }, orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 3 } })).body
    .filter(r => r.document).map(r => Object.fromEntries(Object.entries(r.document.fields).map(([k, v]) => [k, decode(v)])));
  for (const call of calls) {
    let transcript = null;
    try {
      const doc = (await firestore().get(`${documentRoot}/monitoredCalls/${call.id}`)).body.fields;
      transcript = { held: true, chars: Number(doc.chars?.integerValue ?? 0), checks: Number(doc.checks?.integerValue ?? 0),
        cadenceVersion: doc.cadenceVersion?.stringValue ?? 'legacy', pending: !!doc.pending,
        lastCheckAt: Number(doc.lastCheckAt?.integerValue ?? 0) || null, lastSlot: Number(doc.lastSlot?.integerValue ?? -1) };
    } catch { transcript = { held: false }; }
    const at = n => n ? new Date(n).toISOString() : null;
    console.log(JSON.stringify({ call: call.id, state: call.state, outcome: call.outcome, reason: call.reason, created: at(call.createdAt),
      accepted: at(call.acceptedAt), monitored: at(call.monitoringStartedAt), intervened: at(call.monitorIntervenedAt), concern: call.monitorConcern ?? null,
      transcript, events: (call.events ?? []).map(e => e.kind) }));
  }
  const pending = (await firestore().post(`${documentRoot}:runQuery`, { structuredQuery: { from: [{ collectionId: 'monitorChecks' }], limit: 20 } })).body.filter(r => r.document).length;
  const logging = new Client({ urlPrefix: 'https://logging.googleapis.com', apiVersion: 'v2' });
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const errors = (await logging.post('/entries:list', { resourceNames: [`projects/${project}`], pageSize: 50,
    filter: `resource.type="cloud_run_revision" AND resource.labels.service_name=("monitorconnectedcall" OR "monitorscheduledcall" OR "shieldapi") AND severity>=ERROR AND timestamp>="${since}"` })).body.entries ?? [];
  console.log(JSON.stringify({ pendingChecks: pending, errorsLastHour: errors.length, errorServices: [...new Set(errors.map(e => e.resource?.labels?.service_name))] }));
} catch (error) { console.error('Monitoring check failed:', error.status ?? error.code ?? error.name); process.exitCode = 1; }
