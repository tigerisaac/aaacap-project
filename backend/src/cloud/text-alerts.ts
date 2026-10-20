import type { CloudStore } from './store.js';

export type TextSubmission = 'submitted' | 'failed' | 'unknown' | { status: 'submitted'; messageId: string };
export const submissionStatus = (result: TextSubmission) => typeof result === 'string' ? result : result.status;
export const isMessageID = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
export interface TextSender { send(phone: string, text: string): Promise<TextSubmission> }

/** A single bounded submission. An uncertain network result must never be retried automatically. */
export class TelnyxTextSender implements TextSender {
  constructor(readonly store: CloudStore, readonly request: typeof fetch = fetch) {}
  async send(phone: string, text: string): Promise<TextSubmission> {
    const sms = this.store.config.SMS_ALERTS;
    if (!sms) return 'failed';
    try {
      const response = await this.request('https://api.telnyx.com/v2/messages', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { authorization: `Bearer ${this.store.config.TELNYX_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: sms.from, to: phone, text, type: 'SMS', messaging_profile_id: sms.messagingProfileId, use_profile_webhooks: true })
      });
      if (!response.ok) {
        await response.body?.cancel();
        return response.status >= 500 ? 'unknown' : 'failed';
      }
      const result = await response.json() as { data?: { id?: unknown } };
      const id = result.data?.id;
      return isMessageID(id)
        ? { status: 'submitted', messageId: id.toLowerCase() } : 'unknown';
    } catch { return 'unknown'; }
  }
}
