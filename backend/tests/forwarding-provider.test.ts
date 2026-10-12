import { generateKeyPairSync, sign } from 'node:crypto';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { cloudSchema } from '../src/cloud/config.js';
import { TelnyxVoice, validCallId, verifyTelnyx } from '../src/cloud/forwarding-provider.js';
import { registerSignedFormBody } from '../src/cloud/form-body.js';

const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
const timestamp = '1780000000', now = Number(timestamp) * 1000;
const raw = Buffer.from('CallSid=hello&SpeechResult=hello+there');
const signature = sign(null, Buffer.concat([Buffer.from(`${timestamp}|`), raw]), keys.privateKey).toString('base64');
const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
  TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'private-test-key-value', TELNYX_PUBLIC_KEY: publicKey,
  TELNYX_APPLICATION_ID: '123456789012345678', TELNYX_RECORDING_HOSTS: ['media.example.com'] });
const sid = '10123456-1234-4321-1234-000000000001', recId = '20123456-1234-4321-1234-000000000001';
const NUMBER = '+12025550109', PHONE = '+12025550101';

describe('Telnyx authenticated voice adapter', () => {
  it('uses the documented form-encoded call update to hang up and resume, without dialing a new destination', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: 'completed' }));
    const client = new TelnyxVoice(config, mock);
    await client.update(sid, { Status: 'completed' });
    expect(mock.mock.calls[0]![0]).toBe(`https://api.telnyx.com/v2/texml/Accounts/${config.TELNYX_ACCOUNT_ID}/Calls/${sid}`);
    expect(mock.mock.calls[0]![1]!.headers).toMatchObject({ 'content-type': 'application/x-www-form-urlencoded' });
    expect(String(mock.mock.calls[0]![1]!.body)).toBe('Status=completed');
    await client.update(sid, { Url: config.PUBLIC_BASE_URL + '/forwarding/result', Method: 'POST' });
    expect(new URLSearchParams(String(mock.mock.calls[1]![1]!.body)).has('To')).toBe(false);
    await expect(client.update('../other-call', { Status: 'completed' })).rejects.toThrow('invalid_call_id');
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('treats a missing call as already hung up but never as a successful transfer', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    const client = new TelnyxVoice(config, mock);
    await expect(client.update(sid, { Status: 'completed' })).resolves.toBeUndefined();
    await expect(client.update(sid, { Url: config.PUBLIC_BASE_URL + '/forwarding/result', Method: 'POST' })).rejects.toThrow('telnyx_http_404');
  });

  it('authenticates exact bytes, rejects changed bodies, expired/future timestamps and wrong keys', () => {
    expect(verifyTelnyx(publicKey, signature, timestamp, raw, now)).toBe(true);
    expect(verifyTelnyx(publicKey, signature, timestamp, Buffer.from(raw.toString().replace('+', '%20')), now)).toBe(false);
    expect(verifyTelnyx(publicKey, signature, timestamp, raw, now + 300_001)).toBe(false);
    expect(verifyTelnyx(publicKey, signature, timestamp, raw, now - 300_001)).toBe(false);
    expect(verifyTelnyx(Buffer.alloc(32).toString('base64'), signature, timestamp, raw, now)).toBe(false);
    expect(verifyTelnyx(publicKey, signature, timestamp, undefined, now)).toBe(false);
  });
  it('preserves encoded form bytes and rejects ambiguous duplicate fields', async () => {
    const app = Fastify(); registerSignedFormBody(app);
    app.post('/', req => ({ valid: verifyTelnyx(publicKey, signature, timestamp, req.rawFormBody, now), body: req.body }));
    const good = await app.inject({ method: 'POST', url: '/', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: raw });
    expect(good.json()).toEqual({ valid: true, body: { CallSid: 'hello', SpeechResult: 'hello there' } });
    expect((await app.inject({ method: 'POST', url: '/', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'CallSid=one&CallSid=two' })).statusCode).toBe(400);
    await app.close();
  });
  it('accepts documented opaque call IDs but never path separators', () => {
    expect(validCallId(sid)).toBe(true);
    expect(validCallId('v3:abc_DEFG-12345678')).toBe(true);
    expect(validCallId('v3:abc/../Calls/other')).toBe(false);
  });
  it('requires account and call identity in authenticated lookups', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ account_sid: config.TELNYX_ACCOUNT_ID, sid, from: '+12025550109', to: '+12025550101', status: 'in-progress', direction: 'outbound' }));
    const client = new TelnyxVoice(config, mock);
    expect((await client.call(sid)).status).toBe('in-progress');
    mock.mockResolvedValueOnce(Response.json({ account_sid: 'other', sid }));
    await expect(client.call(sid)).rejects.toThrow('call_mismatch');
  });
  it('checks recording ownership, allowlists media and never forwards API credentials to storage', async () => {
    const resource = { account_sid: config.TELNYX_ACCOUNT_ID, sid: recId, call_sid: sid, source: 'RecordVerb', status: 'completed', duration: '12', media_url: 'https://media.example.com/recording.mp3?signature=provider-signed' };
    const mock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(resource)).mockResolvedValueOnce(new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }));
    const client = new TelnyxVoice(config, mock); await client.recording(recId, sid);
    expect(mock.mock.calls[0]![1]!.headers).toEqual({ authorization: `Bearer ${config.TELNYX_API_KEY}` });
    expect(mock.mock.calls[1]![1]!.headers).toBeUndefined();
    expect(mock.mock.calls[1]![1]!.redirect).toBe('error');
    for (const patch of [{ call_sid: 'other' }, { source: 'DialVerb' }, { duration: 'NaN' }, { media_url: 'https://untrusted.example/a' }, { media_url: 'http://media.example.com/a' }, { media_url: 'https://secret@media.example.com/a' }]) {
      mock.mockResolvedValueOnce(Response.json({ ...resource, ...patch }));
      await expect(client.recording(recId, sid)).rejects.toThrow();
    }
    expect(mock).toHaveBeenCalledTimes(8);
  });
  it('places bounded unrecorded probes only between the person\'s own Shield number and phone', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: 'queued' }));
    await new TelnyxVoice(config, mock).startProbe(sid, NUMBER, PHONE);
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, options] = mock.mock.calls[0]!;
    expect(url).toBe(`https://api.telnyx.com/v2/texml/Accounts/${config.TELNYX_ACCOUNT_ID}/Calls`);
    expect(JSON.parse(options!.body as string)).toMatchObject({ From: NUMBER, To: PHONE,
      ApplicationSid: config.TELNYX_APPLICATION_ID, Timeout: 40, TimeLimit: 30, Record: false });
    await expect(new TelnyxVoice(config, mock).startProbe('../unsafe', NUMBER, PHONE)).rejects.toThrow();
    await expect(new TelnyxVoice(config, mock).startProbe(sid, NUMBER, 'anonymous')).rejects.toThrow();
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('deletes recordings idempotently', async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    await expect(new TelnyxVoice(config, mock).deleteRecording(recId)).resolves.toBeUndefined();
    expect(mock.mock.calls[0]![1]!.method).toBe('DELETE');
  });
});
