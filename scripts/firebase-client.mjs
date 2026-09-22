import { createRequire } from 'node:module';
// Reuse the user's official Firebase CLI login; never export credentials to shell output.
const require = createRequire('/opt/homebrew/lib/node_modules/firebase-tools/package.json');
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
