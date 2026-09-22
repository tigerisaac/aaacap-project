import { buildTrialApp, loadTrialConfig } from './trial.js';

const config = loadTrialConfig();
const app = await buildTrialApp(config);
await app.listen({ host: '127.0.0.1', port: config.TRIAL_PORT });
app.log.info({ minutes: config.TRIAL_SESSION_MINUTES, maximumCalls: config.TRIAL_MAX_CALLS }, 'Trial window opened');
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await app.close();
}
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
