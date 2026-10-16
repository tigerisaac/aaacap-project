import type { CloudConfig } from './config.js';
import { streamTicket } from './forwarding-live.js';

/** Warm the runtime and its database channel while the caller still hears ringing.
 * This is deliberately not proof that a later WebSocket lands on the same instance. */
export async function prepareBridge(config: CloudConfig, id: string, budgetMs: number, fetcher: typeof fetch = fetch) {
  if (!config.LIVE_BRIDGE_URL || budgetMs <= 0) throw new Error('screening_startup_expired');
  const expiry = Date.now() + 30_000;
  const response = await fetcher(`${config.LIVE_BRIDGE_URL}/prepare/${id}/${expiry}/${streamTicket(config, id, expiry)}`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.min(8000, budgetMs)))
  });
  if (!response.ok || (await response.json() as any)?.startupProtocol !== 1) throw new Error('screening_prepare_failed');
}
