import { readFile, writeFile, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { Client, connect, project, firestore, documentRoot, fields } from './firebase-client.mjs';
import { Vault } from '../dist/crypto.js';
import { cloudSchema, CONSENT_VERSION } from '../dist/cloud/config.js';

const { email } = await connect();
const auth = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', apiVersion: 'v2' });
await auth.patch(`/projects/${project}/config`, { signIn: { email: { enabled: true, passwordRequired: false } },
  mobileLinksConfig: { domain: 'HOSTING_DOMAIN' } }, { queryParams: { updateMask: 'signIn.email,mobileLinksConfig' } });
const management = new Client({ urlPrefix: 'https://firebase.googleapis.com', apiVersion: 'v1beta1' });
await management.patch(`/projects/${project}/iosApps/1:562628621854:ios:0647c247b1ca320f02600f`, { teamId: '6R6HMW3DWN' }, { queryParams: { updateMask: 'teamId' } });
console.log('Email link sign-in and Wheema iOS team configured.');

const users = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', apiVersion: 'v1' });
const existing = await users.post(`/projects/${project}/accounts:lookup`, { email: [email] });
let ownerUid = existing.body.users?.[0]?.localId;
if (!ownerUid) ownerUid = (await users.post(`/projects/${project}/accounts`, { email, emailVerified: false, displayName: 'Isaac', disabled: false })).body.localId;
if (!ownerUid) throw new Error('Owner account could not be provisioned');

const runtimePath = 'artifacts/private/firebase-runtime.json';
let saved;
try { saved = JSON.parse(await readFile(runtimePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const trial = parseEnv(await readFile('.env.twilio-trial', 'utf8'));
const model = parseEnv(await readFile('.env.openrouter', 'utf8'));
const config = cloudSchema.parse(saved ?? { ...trial, ...model, FIREBASE_PROJECT_ID: project,
  FIREBASE_WEB_API_KEY: execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :API_KEY', 'artifacts/private/GoogleService-Info.plist'], { encoding: 'utf8' }).trim(),
  PUBLIC_BASE_URL: `https://${project}.web.app`, TRIAL_PARTICIPANT_ID: randomUUID(), DATA_ENCRYPTION_KEY: randomBytes(32).toString('hex') });
await writeFile(runtimePath, JSON.stringify(config), { mode: 0o600 }); await chmod(runtimePath, 0o600);
const vault = new Vault(config.DATA_ENCRYPTION_KEY);
const db = firestore(); const personPath = `${documentRoot}/participants/${config.TRIAL_PARTICIPANT_ID}`;
try { await db.get(personPath); }
catch (error) {
  if (error.status !== 404) throw error;
  await db.patch(personPath, { fields: fields({ id: config.TRIAL_PARTICIPANT_ID, ownerUid, trial: true, status: 'setup',
    nameEnc: vault.seal('Isaac', `person:${config.TRIAL_PARTICIPANT_ID}:name`),
    phoneEnc: vault.seal(config.TRIAL_VERIFIED_CALLER, `person:${config.TRIAL_PARTICIPANT_ID}:phone`),
    phoneVerifiedAt: Date.now(), consentVersion: CONSENT_VERSION, consentedAt: Date.now(), createdAt: Date.now() }) });
}
try { await db.get(`${documentRoot}/trial/control`); }
catch (error) {
  if (error.status !== 404) throw error;
  await db.patch(`${documentRoot}/trial/control`, { fields: fields({ enabled: false, used: 0, expiresAt: 0 }) });
}
console.log('Private trial owner enrolled; caller gate remains closed until deployment is verified.');

const iam = new Client({ urlPrefix: 'https://iam.googleapis.com', apiVersion: 'v1' });
const service = `shield-runtime@${project}.iam.gserviceaccount.com`;
try { await iam.get(`/projects/${project}/serviceAccounts/${service}`); }
catch (error) { if (error.status !== 404) throw error;
  await iam.post(`/projects/${project}/serviceAccounts`, { accountId: 'shield-runtime', serviceAccount: { displayName: 'Shield serverless runtime' } }); }
const roleName = `projects/${project}/roles/shieldAuthSessions`;
try { await iam.get(`/${roleName}`); }
catch (error) { if (error.status !== 404) throw error;
  await iam.post(`/projects/${project}/roles`, { roleId: 'shieldAuthSessions', role: {
    title: 'Shield auth session verification', description: 'Verify user state and revoke sessions', stage: 'GA',
    includedPermissions: ['firebaseauth.users.get', 'firebaseauth.users.update'] } }); }
const crm = new Client({ urlPrefix: 'https://cloudresourcemanager.googleapis.com', apiVersion: 'v1' });
const policy = (await crm.post(`/projects/${project}:getIamPolicy`, {})).body;
for (const role of ['roles/datastore.user', 'roles/eventarc.eventReceiver', roleName]) {
  let binding = policy.bindings.find(item => item.role === role && !item.condition);
  if (!binding) { binding = { role, members: [] }; policy.bindings.push(binding); }
  if (!binding.members.includes(`serviceAccount:${service}`)) binding.members.push(`serviceAccount:${service}`);
}
await crm.post(`/projects/${project}:setIamPolicy`, { policy });

const secrets = new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' });
const secretName = `projects/${project}/secrets/SHIELD_RUNTIME`;
try { await secrets.get(`/${secretName}`); }
catch (error) { if (error.status !== 404) throw error;
  await secrets.post(`/projects/${project}/secrets`, { replication: { automatic: {} } }, { queryParams: { secretId: 'SHIELD_RUNTIME' } }); }
await secrets.post(`/${secretName}:addVersion`, { payload: { data: Buffer.from(JSON.stringify(config)).toString('base64') } });
const secretPolicy = (await secrets.get(`/${secretName}:getIamPolicy`)).body;
secretPolicy.bindings ??= [];
let binding = secretPolicy.bindings.find(item => item.role === 'roles/secretmanager.secretAccessor' && !item.condition);
if (!binding) { binding = { role: 'roles/secretmanager.secretAccessor', members: [] }; secretPolicy.bindings.push(binding); }
if (!binding.members.includes(`serviceAccount:${service}`)) binding.members.push(`serviceAccount:${service}`);
await secrets.post(`/${secretName}:setIamPolicy`, { policy: secretPolicy });
console.log('Runtime identity and Secret Manager configured; no service-account key was created.');

// Cloud Run's automatic request log includes full URLs. The private Twilio trial
// uses an approved secret URL, so exclude request access logs in this dedicated project.
const logging = new Client({ urlPrefix: 'https://logging.googleapis.com', apiVersion: 'v2' });
const exclusionName = `projects/${project}/exclusions/shield-private-webhook-urls`;
try { await logging.get(`/${exclusionName}`); }
catch (error) { if (error.status !== 404) throw error;
  await logging.post(`/projects/${project}/exclusions`, { name: 'shield-private-webhook-urls',
    description: 'Avoid retaining private trial webhook secrets in automatic request URLs',
    filter: 'resource.type="cloud_run_revision" AND log_id("run.googleapis.com/requests")' }); }
console.log('Private webhook URLs excluded from automatic Cloud Run access logs.');
