import twilio from 'twilio';
import type { Config } from './config.js';

export interface CallInfo { sid: string; parentSid: string | null; from: string; to: string; status: string; }
export interface Telephony {
  call(sid: string): Promise<CallInfo>;
  children(parentSid: string): Promise<CallInfo[]>;
  end(sid: string): Promise<void>;
  recording(sid: string, expectedCallSid: string): Promise<Buffer>;
  deleteRecording(sid: string): Promise<void>;
}
export const terminal = (status: string) => ['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(status);

export class TwilioTelephony implements Telephony {
  private readonly client: ReturnType<typeof twilio>;
  constructor(private readonly config: Config) {
    this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, { timeout: 4000, autoRetry: false });
  }
  async call(sid: string): Promise<CallInfo> {
    const call = await this.client.calls(sid).fetch();
    return { sid: call.sid, parentSid: call.parentCallSid, from: call.from, to: call.to, status: call.status };
  }
  async children(parentSid: string): Promise<CallInfo[]> {
    const calls = await this.client.calls.list({ parentCallSid: parentSid, limit: 20 });
    return calls.map(call => ({ sid: call.sid, parentSid: call.parentCallSid, from: call.from, to: call.to, status: call.status }));
  }
  async end(sid: string): Promise<void> {
    const call = await this.call(sid);
    if (!terminal(call.status)) await this.client.calls(sid).update({ status: call.status === 'queued' || call.status === 'ringing' ? 'canceled' : 'completed' });
  }
  async recording(sid: string, expectedCallSid: string): Promise<Buffer> {
    if (!/^RE[a-f0-9]{32}$/i.test(sid)) throw new Error('invalid_recording');
    const metadata = await this.client.recordings(sid).fetch();
    if (metadata.callSid !== expectedCallSid || metadata.status !== 'completed') throw new Error('recording_not_ready');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.TWILIO_ACCOUNT_SID}/Recordings/${sid}.mp3`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error',
      headers: { Authorization: `Basic ${Buffer.from(`${this.config.TWILIO_ACCOUNT_SID}:${this.config.TWILIO_AUTH_TOKEN}`).toString('base64')}` } });
    if (!response.ok || !response.body) throw new Error('recording_download_failed');
    if (Number(response.headers.get('content-length') ?? 0) > 10 * 1024 * 1024) throw new Error('recording_too_large');
    const chunks: Uint8Array[] = []; let length = 0;
    for await (const chunk of response.body) {
      length += chunk.byteLength;
      if (length > 10 * 1024 * 1024) throw new Error('recording_too_large');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  async deleteRecording(sid: string): Promise<void> {
    try { await this.client.recordings(sid).remove(); }
    catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
  }
}

export class DemoTelephony implements Telephony {
  readonly calls = new Map<string, CallInfo>();
  readonly ended: string[] = [];
  readonly deletedRecordings: string[] = [];
  async call(sid: string): Promise<CallInfo> {
    const call = this.calls.get(sid);
    if (!call) throw new Error('call_not_found');
    return call;
  }
  async children(parentSid: string) { return [...this.calls.values()].filter(call => call.parentSid === parentSid); }
  async end(sid: string) { const call = await this.call(sid); call.status = 'completed'; this.ended.push(sid); }
  async recording(): Promise<Buffer> { throw new Error('Demo contains no real voicemail audio.'); }
  async deleteRecording(sid: string) { this.deletedRecordings.push(sid); }
}
