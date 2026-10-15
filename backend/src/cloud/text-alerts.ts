import type { CloudStore } from './store.js';

export interface TextSender { send(phone: string, text: string): Promise<'submitted' | 'failed' | 'unknown'> }

/** A single bounded submission. An uncertain network result must never be retried automatically. */
export class TelnyxTextSender implements TextSender {
  constructor(readonly store: CloudStore, readonly request: typeof fetch = fetch) {}
  async send(phone: string, text: string): Promise<'submitted' | 'failed' | 'unknown'> {
    const sms = this.store.config.SMS_ALERTS;
    if (!sms) return 'failed';
    try {
      const response = await this.request('https://api.telnyx.com/v2/messages', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { authorization: `Bearer ${this.store.config.TELNYX_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: sms.from, to: phone, text, type: 'SMS', messaging_profile_id: sms.messagingProfileId, use_profile_webhooks: true })
      });
      await response.body?.cancel();
      return response.ok ? 'submitted' : response.status >= 500 ? 'unknown' : 'failed';
    } catch { return 'unknown'; }
  }
}
