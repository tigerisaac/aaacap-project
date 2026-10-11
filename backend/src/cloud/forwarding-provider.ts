import { createPublicKey, verify } from 'node:crypto';
import type { CloudConfig } from './config.js';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const validCallId = (value: string) => uuid.test(value) || /^v[23]:[a-zA-Z0-9_-]{10,512}$/.test(value);
export const validRecordingId = (value: string) => uuid.test(value);
/** An E.164 caller number, or undefined when the network withheld it ("anonymous", "restricted", empty). Never store the raw value. */
export const callerNumber = (value: string | undefined) => value && /^\+[1-9]\d{7,14}$/.test(value) ? value : undefined;

/** Telnyx signs timestamp|exact request bytes, not a reserialized form or JSON object. */
export function verifyTelnyx(publicKey: string, signature: unknown, timestamp: unknown, raw: Buffer | undefined, now = Date.now()) {
  if (typeof signature !== 'string' || typeof timestamp !== 'string' || !/^\d{10,11}$/.test(timestamp)
    || !raw || Math.abs(now - Number(timestamp) * 1000) > 300_000) return false;
  try {
    const key = Buffer.from(publicKey, 'base64'), sig = Buffer.from(signature, 'base64');
    if (key.length !== 32 || sig.length !== 64) return false;
    const spki = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), key]), format: 'der', type: 'spki' });
    return verify(null, Buffer.concat([Buffer.from(`${timestamp}|`), raw]), spki, sig);
  } catch { return false; }
}

export class TelnyxVoice {
  constructor(readonly config: CloudConfig, readonly fetcher: typeof fetch = fetch) {}
  async request(path: string, method = 'GET', body?: Record<string, unknown>) {
    const response = await this.fetcher(`https://api.telnyx.com/v2/texml/Accounts/${this.config.TELNYX_ACCOUNT_ID}/${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(5000), headers: { authorization: `Bearer ${this.config.TELNYX_API_KEY}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (method === 'DELETE' && (response.ok || response.status === 404)) return;
    if (!response.ok) throw new Error(`telnyx_http_${response.status}`);
    return response.json();
  }
  async update(sid: string, body: { Status: 'completed' } | { Url: string; Method: 'POST' }) {
    if (!validCallId(sid)) throw new Error('invalid_call_id');
    const response = await this.fetcher(`https://api.telnyx.com/v2/texml/Accounts/${this.config.TELNYX_ACCOUNT_ID}/Calls/${encodeURIComponent(sid)}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2500),
      headers: { authorization: `Bearer ${this.config.TELNYX_API_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body)
    });
    if (!response.ok && !(response.status === 404 && 'Status' in body)) throw new Error(`telnyx_http_${response.status}`);
  }
  /** `from` and `to` come from the enrolled person's record: their Shield number and their verified phone. */
  async startProbe(id: string, from: string, to: string) {
    if (!uuid.test(id) || !/^\+1\d{10}$/.test(from) || !/^\+1\d{10}$/.test(to)) throw new Error('invalid_probe');
    const base = `${this.config.PUBLIC_BASE_URL}/forwarding/${this.config.TRIAL_PROXY_SECRET}`;
    await this.request('Calls', 'POST', { ApplicationSid: this.config.TELNYX_APPLICATION_ID,
      From: from, To: to, Url: `${base}/probe/${id}`,
      Method: 'POST', StatusCallback: `${base}/probe-status/${id}`, StatusCallbackMethod: 'POST',
      StatusCallbackEvent: 'initiated ringing answered completed', Timeout: 40, TimeLimit: 30, Record: false });
  }
  async call(sid: string) {
    if (!validCallId(sid)) throw new Error('invalid_call_id');
    const c = await this.request(`Calls/${encodeURIComponent(sid)}`);
    if (c.account_sid !== this.config.TELNYX_ACCOUNT_ID || c.sid !== sid) throw new Error('call_mismatch');
    return { from: c.from as string, to: c.to as string, status: c.status as string, direction: c.direction as string };
  }
  async recording(sid: string, parentSid: string) {
    if (!validRecordingId(sid)) throw new Error('invalid_recording_id');
    const r = await this.request(`Recordings/${sid}.json`);
    if (r.account_sid !== this.config.TELNYX_ACCOUNT_ID || r.sid !== sid || r.call_sid !== parentSid
      || r.source !== 'RecordVerb' || r.status !== 'completed' || !Number.isFinite(Number(r.duration)) || Number(r.duration) < 0 || Number(r.duration) > 65) throw new Error('recording_mismatch');
    const url = new URL(r.media_url);
    // Origins are explicitly configured after reading an authenticated provider resource.
    // Never use a URL from a caller-controlled webhook or send the API key to media storage.
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !this.config.TELNYX_RECORDING_HOSTS.includes(url.hostname)) {
      throw new Error('unapproved_recording_origin');
    }
    return this.fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  }
  async deleteRecording(sid: string) {
    if (!validRecordingId(sid)) throw new Error('invalid_recording_id');
    await this.request(`Recordings/${sid}.json`, 'DELETE');
  }
}

export function recordingProvider(c: CloudConfig) {
  const client = new TelnyxVoice(c);
  return { fetch: (sid: string, parent: string) => client.recording(sid, parent), remove: (sid: string) => client.deleteRecording(sid) };
}
