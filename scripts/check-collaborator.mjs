import { assertRepository, credentialPresence, projectId, readLocalEnv } from './collaborator-config.mjs';

const online = process.argv.includes('--online');
const checks = [];
const record = (name, status, detail) => checks.push({ name, status, detail });
async function probe(url, headers) {
  // No inference, calls, redirects, or response-body logging.
  const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(10000) });
  await response.body?.cancel();
  return response.status;
}
try {
  if (process.argv.slice(2).some(arg => arg !== '--online')) throw new Error('Unsupported option');
  assertRepository();
  record('repository', 'ready', 'tigerisaac/aaacap-project');
  const config = { ...await readLocalEnv('.env.twilio-trial'), ...await readLocalEnv('.env.openrouter') };
  const present = credentialPresence(config);
  record('configuration', 'checked', present);
  record('firebase-project', 'configured', projectId);
  if (online) {
    try {
      const { Client, connect } = await import('./firebase-client.mjs');
      await connect();
      const api = new Client({ urlPrefix: 'https://firebase.googleapis.com', apiVersion: 'v1beta1' });
      await api.get(`/projects/${projectId}`);
      record('firebase-access', 'ready', 'Project visible; deployment permissions not proven.');
    } catch { record('firebase-access', 'missing', 'Sign in with npx firebase login and verify project membership.'); }
    if (present.OPENROUTER_API_KEY) {
      try { const status = await probe('https://openrouter.ai/api/v1/key', { Authorization: `Bearer ${config.OPENROUTER_API_KEY}` });
        record('openrouter-access', status === 200 ? 'ready' : 'failed', `HTTP ${status}; no inference request made.`);
      } catch { record('openrouter-access', 'failed', 'Provider check failed; no credentials or response bodies logged.'); }
    } else record('openrouter-access', 'missing', 'Run npm run collaborator:setup after owner grants secret access.');
    if (/^AC[a-f0-9]{32}$/i.test(config.TWILIO_ACCOUNT_SID ?? '') && present.TWILIO_AUTH_TOKEN) {
      try { const status = await probe(`https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}.json`, {
        Authorization: `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64')}` });
        record('twilio-access', status === 200 ? 'ready' : 'failed', `HTTP ${status}; no calls placed.`);
      } catch { record('twilio-access', 'failed', 'Provider check failed; no credentials or response bodies logged.'); }
    } else record('twilio-access', 'missing', 'Create your own Twilio trial and configure .env.twilio-trial privately.');
  } else record('network', 'skipped', 'Use --online for read-only provider checks.');
  console.log(JSON.stringify({ checks, limitation: 'Presence and authentication only; not evidence of funded inference, deployability, or working phone calls.' }, null, 2));
  if (checks.some(c => c.status === 'failed' || c.status === 'missing')) process.exitCode = 1;
} catch {
  console.error('Preflight could not run. Use the verified repository root and readable local configuration. No credential values were printed.');
  process.exitCode = 1;
}
