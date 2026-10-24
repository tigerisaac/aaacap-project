// Set or remove App Review sign-in (APP_REVIEW_SIGN_IN) in the runtime secret.
// Usage: node scripts/set-app-review-sign-in.mjs [--off]. Never prints the number or code; redeploy Functions to apply.
// The number and code for App Store Connect are kept in artifacts/private/app-review-sign-in.json (git-ignored).
import { createHash, randomInt } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Client, connect, project } from './firebase-client.mjs';
import { cloudSchema } from '../dist/cloud/config.js';

const off = process.argv.includes('--off'), file = 'artifacts/private/app-review-sign-in.json';
try {
  let review = null;
  if (!off) {
    review = await readFile(file, 'utf8').then(JSON.parse).catch(() => null);
    if (!review) {
      // 555-0100 to 555-0199 is reserved for fiction, so the number can't belong to a real subscriber.
      review = { phone: `+1512555${String(randomInt(100, 200)).padStart(4, '0')}`, code: String(randomInt(10_000_000, 100_000_000)) };
      await mkdir('artifacts/private', { recursive: true });
      await writeFile(file, JSON.stringify(review, null, 2) + '\n', { mode: 0o600 });
    }
  }
  await connect();
  const secrets = new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' });
  const path = `/projects/${project}/secrets/SHIELD_RUNTIME`;
  const stored = (await secrets.get(`${path}/versions/latest:access`)).body;
  const current = JSON.parse(Buffer.from(stored.payload.data, 'base64').toString());
  const { APP_REVIEW_SIGN_IN: previous, ...rest } = current;
  const next = review ? { ...rest, APP_REVIEW_SIGN_IN: { phone: review.phone, codeSha256: createHash('sha256').update(review.code).digest('hex') } } : rest;
  cloudSchema.parse(next);
  let version = stored.name;
  if (JSON.stringify(previous ?? null) !== JSON.stringify(next.APP_REVIEW_SIGN_IN ?? null)) {
    version = (await secrets.post(`${path}:addVersion`, { payload: { data: Buffer.from(JSON.stringify(next)).toString('base64') } })).body.name;
  }
  console.log(JSON.stringify({ appReviewSignIn: !off, credentialsFile: off ? null : file, runtimeVersion: version.split('/').at(-1), redeployFunctionsToApply: true }));
} catch (error) {
  console.error('App Review sign-in update failed:', /^[a-z_]+$/.test(error.message ?? '') ? error.message : error.status ?? error.code ?? error.name);
  process.exitCode = 1;
}
