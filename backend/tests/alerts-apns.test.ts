import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Http2Server, type IncomingHttpHeaders } from 'node:http2';
import { generateKeyPairSync, verify } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { APNsSender, type PushEnvironment } from '../src/cloud/alerts.js';

const keys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const config = { keyId: 'ABCDEF1234', teamId: '6R6HMW3DWN', privateKey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
const token = 'ab'.repeat(32);

describe('APNs sender', () => {
  let server: Http2Server, origins: Record<PushEnvironment, string>;
  const seen: { headers: IncomingHttpHeaders; body: string }[] = [];
  let reply: { status: number; body?: string } = { status: 200 };
  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ''; request.setEncoding('utf8');
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => { seen.push({ headers: request.headers, body }); response.writeHead(reply.status); response.end(reply.body ?? ''); });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    origins = { development: origin, production: origin };
  });
  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

  it('sends a fixed alert with a signed provider token to the app topic', async () => {
    seen.length = 0; reply = { status: 200 };
    const sender = new APNsSender(config, 'org.isaaczhang.Shield', origins);
    expect(await sender.send(token, 'production', 'You have a new voicemail in Shield.', 'voicemail')).toBe('sent');
    const [{ headers, body }] = seen as [typeof seen[0]];
    expect(headers).toMatchObject({ ':method': 'POST', ':path': `/3/device/${token}`, 'apns-topic': 'org.isaaczhang.Shield', 'apns-push-type': 'alert', 'apns-priority': '10' });
    expect(JSON.parse(body)).toEqual({ aps: { alert: { title: 'Shield', body: 'You have a new voicemail in Shield.' }, sound: 'default', 'thread-id': 'shield', 'content-available': 1 }, shield: { kind: 'voicemail' } });
    const [header, claims, signature] = String(headers.authorization).replace('bearer ', '').split('.') as [string, string, string];
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'ABCDEF1234' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toMatchObject({ iss: '6R6HMW3DWN' });
    expect(verify('sha256', Buffer.from(`${header}.${claims}`), { key: keys.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'))).toBe(true);
  });
  it.each([
    [410, '{"reason":"Unregistered"}', 'unregistered'], [400, '{"reason":"BadDeviceToken"}', 'unregistered'],
    [400, '{"reason":"DeviceTokenNotForTopic"}', 'unregistered'], [403, '{"reason":"InvalidProviderToken"}', 'failed'], [500, '', 'failed']
  ] as const)('maps HTTP %i %s to %s', async (status, body, expected) => {
    reply = { status, body };
    expect(await new APNsSender(config, 'org.isaaczhang.Shield', origins).send(token, 'development', 'x', 'voicemail')).toBe(expected);
  });
  it('rejects a malformed token without a request, and reports an unreachable service as a failure', async () => {
    seen.length = 0;
    const sender = new APNsSender(config, 'org.isaaczhang.Shield', { development: 'http://127.0.0.1:1', production: 'http://127.0.0.1:1' });
    expect(await sender.send('not-a-token', 'production', 'x', 'voicemail')).toBe('unregistered');
    expect(await sender.send(token, 'production', 'x', 'voicemail')).toBe('failed');
    expect(seen).toHaveLength(0);
  });
  it('reuses the provider token for 50 minutes, then signs a new one', () => {
    let now = 1_700_000_000_000; const sender = new APNsSender(config, 'org.isaaczhang.Shield', origins, () => now);
    const first = sender.token(); now += 50 * 60_000; expect(sender.token()).toBe(first);
    now += 1; expect(sender.token()).not.toBe(first);
  });
});
