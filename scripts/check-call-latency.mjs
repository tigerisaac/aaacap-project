import { readFile, writeFile } from 'node:fs/promises';
import { Client, connect, firestore, documentRoot, project } from './firebase-client.mjs';

// Read-only diagnostics. Output has no provider call IDs, numbers, URLs, tokens or speech.
await connect();
const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
const db = firestore();
const decode = value => value?.stringValue ?? value?.booleanValue ?? (value?.integerValue !== undefined
  ? Number(value.integerValue) : value?.arrayValue ? (value.arrayValue.values ?? []).map(decode)
    : value?.mapValue ? Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decode(item)])) : null);
const control = decode({ mapValue: (await db.get(`${documentRoot}/trial/control`)).body });
const result = await db.post(`${documentRoot}:runQuery`, { structuredQuery: {
  from: [{ collectionId: 'callSessions' }], where: { fieldFilter: { field: { fieldPath: 'participantId' },
    op: 'EQUAL', value: { stringValue: config.TRIAL_PARTICIPANT_ID } } },
  orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 10
} });
const calls = (result.body ?? []).filter(item => item.document).map(item => {
  const call = decode({ mapValue: item.document });
  const at = kind => call.events?.find(event => event.kind === kind)?.at;
  const duration = (start, end) => at(start) && at(end) ? at(end) - at(start) : null;
  return { startedAt: new Date(call.createdAt).toISOString(), state: call.state, reason: call.reason,
    polls: call.polls, queueMs: call.timings?.queueMs ?? null, modelMs: call.timings?.modelMs ?? null,
    introductionToDecisionMs: duration('introduction_received', 'screening_completed'),
    decisionToResultMs: duration('screening_completed', 'trial_result_played') };
});
const logs = new Client({ urlPrefix: 'https://logging.googleapis.com', apiVersion: 'v2' });
const entries = await logs.post('/entries:list', { resourceNames: [`projects/${project}`],
  filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="shieldapi" AND timestamp>="${new Date(Date.now() - 3600_000).toISOString()}" AND (jsonPayload.event="trial_webhook_timing" OR textPayload:"trial_webhook_timing")`,
  orderBy: 'timestamp desc', pageSize: 40 });
const webhooks = (entries.body.entries ?? []).flatMap(entry => {
  let data = entry.jsonPayload;
  if (!data && entry.textPayload) { try { data = JSON.parse(entry.textPayload); } catch { return []; } }
  if (data?.event !== 'trial_webhook_timing' || !['inbound', 'introduction', 'result', 'fallback'].includes(data.step)) return [];
  return [{ at: entry.timestamp, step: data.step, elapsedMs: Number(data.elapsedMs),
    providerLookupMs: Number(data.providerLookupMs), statusCode: Number(data.statusCode) }];
});
const report = { checkedAt: new Date().toISOString(), trial: { active: control.enabled && control.expiresAt > Date.now(),
  used: control.used, expiresAt: new Date(control.expiresAt).toISOString() }, calls, webhooks };
await writeFile('artifacts/private/firebase-call-latency.json', JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
