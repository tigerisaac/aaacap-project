import { firestore, documentRoot, fields } from '../firebase-client.mjs';

// Minimal Firestore REST access for operator scripts (the Firebase CLI login, not a service key).
// Writes take an optional precondition so two operators can't race each other into an inconsistent state.
const decode = v => 'mapValue' in v ? decodeFields(v.mapValue.fields ?? {}) : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(decode)
  : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'nullValue' in v ? null : v.stringValue ?? v.booleanValue ?? null;
export const decodeFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));
export const docPath = path => `${documentRoot}/${path.split('/').map(encodeURIComponent).join('/')}`;

export function rest() {
  const db = firestore();
  /** The document's fields and update time, or undefined if it doesn't exist. */
  async function read(path) {
    try { const body = (await db.get(docPath(path))).body; return { data: decodeFields(body.fields ?? {}), updateTime: body.updateTime }; }
    catch (e) { if (e.status === 404) return undefined; throw e; }
  }
  /** Merge `data` into the document. `exists: false` creates only; `updateTime` updates only that exact version. */
  async function patch(path, data, { exists, updateTime } = {}) {
    const query = new URLSearchParams(Object.keys(data).map(key => ['updateMask.fieldPaths', key]));
    if (exists !== undefined) query.set('currentDocument.exists', String(exists));
    if (updateTime) query.set('currentDocument.updateTime', updateTime);
    return db.patch(docPath(path), { fields: fields(data) }, { queryParams: query });
  }
  async function list(collection) {
    const result = (await db.post(`${documentRoot}:runQuery`, { structuredQuery: { from: [{ collectionId: collection }], limit: 500 } })).body;
    return result.filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), data: decodeFields(r.document.fields ?? {}), updateTime: r.document.updateTime }));
  }
  return { read, patch, list };
}
