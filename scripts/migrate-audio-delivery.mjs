import { connect, firestore, documentRoot, fields } from './firebase-client.mjs';

// Read-only by default. --apply changes live retention and requires the owner's deployment approval.
// Never download, print, export or evaluate recordings, transcripts, phone numbers or summaries.
const apply = process.argv.includes('--apply');
await connect();
const client = firestore(), deadline = Date.now() + 24 * 3600_000;
let pageToken, examined = 0, shortened = 0, conflicts = 0;
do {
  const query = new URLSearchParams({ pageSize: '100', ...(pageToken ? { pageToken } : {}) });
  for (const field of ['expiresAt', 'chunks']) query.append('mask.fieldPaths', field);
  const response = await client.get(`${documentRoot}/forwardingAudio?${query}`);
  for (const doc of response.body.documents ?? []) {
    examined++;
    const expiresAt = Number(doc.fields?.expiresAt?.integerValue);
    if (!Number.isFinite(expiresAt) || expiresAt <= deadline) continue;
    if (apply) {
      const id = doc.name.split('/').at(-1), chunks = Number(doc.fields?.chunks?.integerValue ?? 0);
      if (!Number.isInteger(chunks) || chunks < 0 || chunks > 5) throw new Error('Invalid audio manifest');
      const writes = [{ update: { name: doc.name, fields: fields({ expiresAt: deadline }) },
        updateMask: { fieldPaths: ['expiresAt'] }, currentDocument: { updateTime: doc.updateTime } }];
      for (let index = 0; index < chunks; index++) writes.push({
        update: { name: `${documentRoot.slice(1)}/forwardingAudioChunks/${id}:${index}`, fields: fields({ expiresAt: deadline }) },
        updateMask: { fieldPaths: ['expiresAt'] }, currentDocument: { exists: true }
      });
      const call = await client.get(`${documentRoot}/callSessions/${id}`, {
        queryParams: { 'mask.fieldPaths': ['voicemail.id'] }, resolveOnHTTPError: true
      });
      if (call.status === 200 && call.body.fields?.voicemail) writes.push({
        update: { name: `${documentRoot.slice(1)}/callSessions/${id}`, fields: fields({ voicemail: { audioExpiresAt: deadline } }) },
        updateMask: { fieldPaths: ['voicemail.audioExpiresAt'] }, currentDocument: { updateTime: call.body.updateTime }
      });
      const result = await client.post(`${documentRoot}:commit`, { writes }, { resolveOnHTTPError: true });
      if (result.status === 409 || result.status === 400 && result.body?.error?.status === 'FAILED_PRECONDITION') { conflicts++; continue; }
      if (result.status !== 200) throw new Error('Retention update failed; no content logged');
    }
    shortened++;
  }
  pageToken = response.body.nextPageToken;
} while (pageToken);
console.log(JSON.stringify({ mode: apply ? 'applied' : 'read-only', recordings: examined, [apply ? 'shortened' : 'wouldShorten']: shortened,
  concurrentChangesSkipped: conflicts, deadline: new Date(deadline).toISOString() }));
