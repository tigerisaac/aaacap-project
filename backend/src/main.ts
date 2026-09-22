import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const { app, worker } = await buildApp(config);
await app.listen({ host: config.HOST, port: config.PORT });
let activeTick: Promise<void> | undefined;
const timer = setInterval(() => {
  if (activeTick) return;
  activeTick = worker.tick().catch(() => app.log.error({ code: 'worker_tick_failed' }, 'Worker needs attention')).finally(() => { activeTick = undefined; });
}, 5000);
timer.unref();
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true; clearInterval(timer); await activeTick; await app.close();
}
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
