import { createRequire } from 'node:module';
// Reuse the signed-in user's Firebase CLI login from the pinned local dependency.
// This adapter uses CLI internals; validate it when upgrading firebase-tools.
// Never export credentials or complete provider responses to shell output.
const localRequire = createRequire(import.meta.url);
const require = createRequire(localRequire.resolve('firebase-tools/package.json'));
const { getGlobalDefaultAccount } = require('./lib/auth.js');
const { requireAuth } = require('./lib/requireAuth.js');
export const { Client } = require('./lib/apiv2.js');
export const project = 'shield-calls-isaac';
export async function connect() {
  const account = getGlobalDefaultAccount();
  if (!account?.user?.email) throw new Error('Firebase login required');
  await requireAuth({ ...account, project, nonInteractive: true });
  return { email: account.user.email };
}
export const firestore = () => new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' });
export const documentRoot = `/projects/${project}/databases/(default)/documents`;
export function fields(data) {
  const value = input => input === null ? { nullValue: null } : typeof input === 'boolean' ? { booleanValue: input }
    : typeof input === 'number' ? { integerValue: String(input) } : typeof input === 'string' ? { stringValue: input }
      : Array.isArray(input) ? { arrayValue: { values: input.map(value) } } : { mapValue: { fields: fields(input) } };
  return Object.fromEntries(Object.entries(data).map(([key, input]) => [key, value(input)]));
}
