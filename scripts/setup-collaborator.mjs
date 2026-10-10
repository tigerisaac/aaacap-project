import { lstat } from 'node:fs/promises';
import { assertRepository, projectId, secretId, writeOpenRouterEnv } from './collaborator-config.mjs';

try {
  assertRepository();
  if (process.argv.length > 2) throw new Error('This command takes no arguments.');
  let exists = false;
  try { await lstat('.env.openrouter'); exists = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) {
    console.log('Existing .env.openrouter preserved. Run npm run collaborator:check.');
  } else {
    const { Client, connect } = await import('./firebase-client.mjs');
    await connect();
    const sm = new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' });
    const result = await sm.get(`/projects/${projectId}/secrets/${secretId}/versions/latest:access`);
    const config = JSON.parse(Buffer.from(result.body.payload.data, 'base64').toString('utf8'));
    await writeOpenRouterEnv('.env.openrouter', config);
    console.log('Saved shared OpenRouter configuration to ignored .env.openrouter with private permissions. No key was printed.');
  }
} catch {
  console.error('Setup did not complete. Confirm the repo root, run npx firebase login with your invited Google account, and ask the owner to verify access to SHIELD_COLLABORATOR_OPENROUTER. Existing files were not overwritten.');
  process.exitCode = 1;
}
