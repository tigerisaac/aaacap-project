import { createHmac } from 'node:crypto';
import { secureEqual } from '../crypto.js';
import type { CloudConfig } from './config.js';

export const validControlId = (s: unknown): s is string => typeof s === 'string' && /^[a-zA-Z0-9_:+/=-]{1,512}$/.test(s);
export class CallControlProvider {
  constructor(readonly config: CloudConfig, readonly fetcher: typeof fetch = fetch) {}
  async request(path: string, body?: Record<string, unknown>, method = body ? 'POST' : 'GET'): Promise<any> {
    const r = await this.fetcher(`https://api.telnyx.com/v2${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(4000),
      headers: { authorization: `Bearer ${this.config.TELNYX_API_KEY}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (method === 'DELETE' && r.status === 404) return;
    if (!r.ok) throw new Error(`telnyx_http_${r.status}`);
    return r.status === 204 ? undefined : (await r.json() as any).data;
  }
  action(sid: string, action: string, body: Record<string, unknown> = {}) {
    if (!validControlId(sid) || !/^[a-z_]+$/.test(action)) throw new Error('invalid_command');
    return this.request(`/calls/${encodeURIComponent(sid)}/actions/${action}`, body);
  }
  state(id: string, phase: string) {
    const value = `${id}:${phase}`;
    return Buffer.from(`${value}:${createHmac('sha256', this.config.TRIAL_PROXY_SECRET).update(`cc:${value}`).digest('hex')}`).toString('base64');
  }
  readState(input: unknown): { id: string; phase: string } | undefined {
    if (typeof input !== 'string' || input.length > 400) return;
    const value = Buffer.from(input, 'base64').toString('utf8'), m = /^([a-f0-9-]{36}):([a-z-]{1,30}):([a-f0-9]{64})$/.exec(value);
    if (!m || !secureEqual(input, this.state(m[1]!, m[2]!))) return;
    return { id: m[1]!, phase: m[2]! };
  }
}
