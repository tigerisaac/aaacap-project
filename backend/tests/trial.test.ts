import twilio from 'twilio';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTrialApp, loadTrialConfig } from '../src/trial.js';
import { type Extraction } from '../src/screening.js';
import { routine } from './helpers.js';

const environment = {
  NODE_ENV: 'test', TRIAL_PUBLIC_BASE_URL: 'https://trial.example.com',
  TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'test-only-token-'.repeat(3),
  TRIAL_TWILIO_NUMBER: '+15125550110', TRIAL_VERIFIED_CALLER: '+15125550100',
  TRIAL_MAX_CALLS: '2', TRIAL_SESSION_MINUTES: '5'
};
const config = loadTrialConfig(environment);
const base = { AccountSid: config.TWILIO_ACCOUNT_SID, CallSid: `CA${'b'.repeat(32)}`,
  From: config.TRIAL_VERIFIED_CALLER, To: config.TRIAL_TWILIO_NUMBER, Direction: 'inbound' };
const apps: Awaited<ReturnType<typeof buildTrialApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

async function fixture() {
  let time = 0;
  const events: string[] = [];
  const rejections: string[] = [];
  const app = await buildTrialApp(config, { logger: false, now: () => time, onEvent: event => events.push(event),
    onRejected: reason => rejections.push(reason) });
  apps.push(app);
  async function post(url: string, values: Record<string, string> = {}, signedValues?: Record<string, string>) {
    const payload = { ...base, ...values };
    return app.inject({ method: 'POST', url, payload: new URLSearchParams(payload).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': twilio.getExpectedTwilioSignature(config.TWILIO_AUTH_TOKEN,
          `${config.TRIAL_PUBLIC_BASE_URL}${url}`, signedValues ?? payload) } });
  }
  return { app, events, rejections, post, advance: (milliseconds: number) => { time += milliseconds; } };
}

describe('isolated Twilio trial connectivity', () => {
  it('collects one introduction without recording, bridging, echoing or storing its text', async () => {
    const f = await fixture();
    const inbound = await f.post('/voice/inbound');
    expect(inbound.statusCode).toBe(200);
    expect(inbound.body).toContain('<Gather');
    expect(inbound.body).toContain('https://trial.example.com/voice/introduction');
    expect(inbound.body).not.toMatch(/<(Record|Dial|Stream)/);
    const result = await f.post('/voice/introduction', { SpeechResult: 'Private example content' });
    expect(result.body).toContain('connection test succeeded');
    expect(result.body).not.toContain('Private example content');
    expect(f.events).toEqual(['call_received', 'introduction_received']);
    expect((await f.app.inject('/api/calls')).statusCode).toBe(404);
  });
  it('rejects unsigned, altered, foreign-account and unapproved-number webhooks', async () => {
    const f = await fixture();
    expect((await f.app.inject({ method: 'POST', url: '/voice/inbound', payload: base })).statusCode).toBe(403);
    expect((await f.post('/voice/inbound', { From: '+15125550199' })).statusCode).toBe(403);
    expect((await f.post('/voice/inbound', { To: '+15125550199' })).statusCode).toBe(403);
    expect((await f.post('/voice/inbound', { AccountSid: `AC${'c'.repeat(32)}` })).statusCode).toBe(403);
    expect((await f.post('/voice/inbound', { Direction: 'outbound-api' })).statusCode).toBe(403);
    expect((await f.post('/voice/inbound', { SpeechResult: 'changed' }, base)).statusCode).toBe(403);
    expect(f.events).toEqual([]);
    expect(f.rejections).toEqual(['missing_signature', 'caller_mismatch', 'destination_mismatch',
      'account_mismatch', 'not_inbound', 'invalid_signature']);
  });
  it('rejects out-of-order, duplicate and stale callback requests', async () => {
    const f = await fixture();
    expect((await f.post('/voice/introduction', { SpeechResult: 'early' })).body).not.toContain('succeeded');
    await f.post('/voice/inbound');
    expect((await f.post('/voice/inbound')).body).not.toContain('<Gather');
    await f.post('/voice/introduction', { SpeechResult: 'first' });
    expect((await f.post('/voice/introduction', { SpeechResult: 'second' })).body).not.toContain('succeeded');
    const second = { CallSid: `CA${'d'.repeat(32)}` };
    await f.post('/voice/inbound', second);
    f.advance(120001);
    expect((await f.post('/voice/introduction', { ...second, SpeechResult: 'late' })).body).not.toContain('succeeded');
    expect(f.events.filter(event => event === 'introduction_received')).toHaveLength(1);
  });
  it('reports missing speech honestly and enforces the session call budget', async () => {
    const f = await fixture();
    await f.post('/voice/inbound');
    expect((await f.post('/voice/introduction')).body).toContain("didn't hear a reason");
    await f.post('/voice/inbound', { CallSid: `CA${'d'.repeat(32)}` });
    expect((await f.post('/voice/inbound', { CallSid: `CA${'e'.repeat(32)}` })).body).toContain('session has ended');
    expect(f.events.filter(event => event === 'call_received')).toHaveLength(2);
  });
  it('expires the test window and never exposes call data in health checks', async () => {
    const f = await fixture();
    expect((await f.app.inject('/healthz')).json()).toEqual({ status: 'ready', mode: 'voice-trial' });
    await f.post('/voice/inbound');
    f.advance(300001);
    expect((await f.app.inject('/healthz')).json()).toEqual({ status: 'expired', mode: 'voice-trial' });
    expect((await f.post('/voice/introduction', { SpeechResult: 'late' })).body).not.toContain('succeeded');
    expect((await f.post('/voice/inbound', { CallSid: `CA${'d'.repeat(32)}` })).body).not.toContain('<Gather');
  });
  it('requires an HTTPS origin, real credentials, distinct numbers and non-production mode', () => {
    for (const change of [
      { TRIAL_PUBLIC_BASE_URL: 'http://trial.example.com' },
      { TRIAL_PUBLIC_BASE_URL: 'https://trial.example.com/path' },
      { TRIAL_PUBLIC_BASE_URL: 'https://user:secret@trial.example.com' },
      { TWILIO_AUTH_TOKEN: '' }, { NODE_ENV: 'production' }, { TRIAL_PROXY_SECRET: 'short' },
      { TRIAL_VERIFIED_CALLER: environment.TRIAL_TWILIO_NUMBER }
    ]) expect(() => loadTrialConfig({ ...environment, ...change })).toThrow();
  });
});

describe('trial screening demo', () => {
  const aiConfig = loadTrialConfig({ ...environment, TRIAL_SCREENING_ENABLED: 'true',
    SCREENING_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'synthetic-key',
    OPENROUTER_MODEL: 'google/gemini-3.7-flash', MODEL_TIMEOUT_MS: '500' });
  async function aiFixture(extract: (text: string) => Promise<Extraction>) {
    const decisions: string[] = [];
    const app = await buildTrialApp(aiConfig, { logger: false,
      screener: { version: 'synthetic-model', extract }, onDecision: decision => decisions.push(decision.route) });
    apps.push(app);
    const post = (path: string, values: Record<string, string> = {}) => {
      const payload = { ...base, ...values };
      return app.inject({ method: 'POST', url: path, payload: new URLSearchParams(payload).toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature':
          twilio.getExpectedTwilioSignature(aiConfig.TWILIO_AUTH_TOKEN, `${aiConfig.TRIAL_PUBLIC_BASE_URL}${path}`, payload) } });
    };
    return { app, post, decisions };
  }
  it('uses the short opening and returns immediately while one extraction is pending', async () => {
    let resolve!: (value: Extraction) => void;
    const extract = vi.fn(() => new Promise<Extraction>(done => { resolve = done; }));
    const f = await aiFixture(extract);
    const greeting = await f.post('/voice/inbound');
    expect(greeting.body).toContain("Hello, what's your reason for calling?");
    expect(greeting.body).toContain('speechTimeout="2"');
    const introduction = await f.post('/voice/introduction', { SpeechResult: 'Appointment tomorrow.' });
    expect(introduction.body).toContain('/voice/result');
    expect(introduction.body).not.toContain('looks routine');
    expect(extract).toHaveBeenCalledTimes(1);
    await f.post('/voice/introduction', { SpeechResult: 'Duplicate payload' });
    expect(extract).toHaveBeenCalledTimes(1);
    expect((await f.post('/voice/result')).body).toContain('<Redirect');
    resolve(routine);
    await Promise.resolve();
    const result = await f.post('/voice/result');
    expect(result.body).toContain('looks routine');
    expect(result.body).not.toMatch(/<(Dial|Record|Stream)/);
    expect((await f.post('/voice/result')).body).not.toContain('looks routine');
    expect(f.decisions).toEqual(['offer']);
  });
  it('speaks fixed review results without echoing model evidence or caller text', async () => {
    const f = await aiFixture(async () => ({ ...routine,
      prohibitedRequests: [{ type: 'secret_code', evidence: 'give me your code' }] }));
    await f.post('/voice/inbound');
    await f.post('/voice/introduction', { SpeechResult: 'Please give me your code.' });
    const result = await f.post('/voice/result');
    expect(result.body).toContain('held for review');
    expect(result.body).not.toContain('give me your code');
    expect(f.decisions).toEqual(['refuse']);
  });
  it('handles unavailable models honestly and does not classify silence or unmatched callbacks', async () => {
    const extract = vi.fn(async (): Promise<Extraction> => { throw new Error('Unavailable'); });
    const f = await aiFixture(extract);
    await f.post('/voice/introduction', { SpeechResult: 'No preceding call.' });
    expect(extract).not.toHaveBeenCalled();
    await f.post('/voice/inbound');
    await f.post('/voice/introduction');
    expect(extract).not.toHaveBeenCalled();
    const second = { CallSid: `CA${'d'.repeat(32)}` };
    await f.post('/voice/inbound', second);
    await f.post('/voice/introduction', { ...second, SpeechResult: 'Appointment tomorrow.' });
    expect((await f.post('/voice/result', second)).body).toContain('Screening is unavailable');
    expect(f.decisions).toEqual(['message']);
  });
  it('bounds result polling below the trial hop limit and never emits a late verdict twice', async () => {
    let resolve!: (value: Extraction) => void;
    const f = await aiFixture(() => new Promise<Extraction>(done => { resolve = done; }));
    await f.post('/voice/inbound');
    await f.post('/voice/introduction', { SpeechResult: 'Appointment tomorrow.' });
    for (let count = 0; count < 3; count++) expect((await f.post('/voice/result')).body).toContain('<Redirect');
    expect((await f.post('/voice/result')).body).toContain("Screening didn't finish");
    resolve(routine);
    await Promise.resolve();
    expect((await f.post('/voice/result')).body).not.toContain('looks routine');
  });
});

describe('trial interceptor compatibility', () => {
  const secret = 'e'.repeat(64);
  const prefix = `/trial/${secret}`;
  const provider = { sid: base.CallSid, accountSid: base.AccountSid, from: base.From, to: base.To,
    direction: 'inbound', status: 'in-progress', dateCreated: new Date(0) };
  async function proxyFixture() {
    let time = 0;
    const events: string[] = [];
    const rejections: string[] = [];
    const lookupCall = vi.fn(async (_sid: string) => ({ ...provider }));
    const app = await buildTrialApp({ ...config, TRIAL_PROXY_SECRET: secret }, {
      logger: false, now: () => time, lookupCall, onEvent: event => events.push(event),
      onRejected: reason => rejections.push(reason)
    });
    apps.push(app);
    const post = (path = `${prefix}/inbound`, values: Record<string, string> = {}) => app.inject({
      method: 'POST', url: path, payload: new URLSearchParams({ ...base, ...values }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    });
    return { app, post, events, rejections, lookupCall, advance: (ms: number) => { time += ms; } };
  }
  it('requires opt-in and never makes the signed endpoint accept unsigned requests', async () => {
    const signed = await fixture();
    expect((await signed.post(`${prefix}/inbound`)).statusCode).toBe(404);
    const f = await proxyFixture();
    expect((await f.post('/voice/inbound')).statusCode).toBe(403);
    expect(f.rejections).toEqual(['missing_signature']);
    expect(f.lookupCall).not.toHaveBeenCalled();
  });
  it('accepts only a secret-authenticated, active provider call and preserves callback authentication', async () => {
    const f = await proxyFixture();
    const inbound = await f.post();
    expect(inbound.statusCode).toBe(200);
    expect(inbound.body).toContain(`${prefix}/introduction`);
    expect(inbound.body).not.toMatch(/<(Record|Dial|Stream)/);
    const result = await f.post(`${prefix}/introduction`, { SpeechResult: 'Synthetic introduction' });
    expect(result.body).toContain('connection test succeeded');
    expect(result.body).not.toContain('Synthetic introduction');
    expect(f.lookupCall).toHaveBeenCalledTimes(2);
    expect(f.lookupCall).toHaveBeenCalledWith(base.CallSid);
    expect(f.events).toEqual(['call_received', 'introduction_received']);
    await f.post(`${prefix}/introduction`, { SpeechResult: 'Repeated' });
    expect(f.events).toHaveLength(2);
  });
  it('rejects incorrect or malformed secrets before any provider lookup', async () => {
    const f = await proxyFixture();
    for (const value of ['wrong', 'f'.repeat(64), 'é'.repeat(64)]) {
      expect((await f.post(`/trial/${encodeURIComponent(value)}/inbound`)).statusCode).toBe(403);
    }
    expect(f.lookupCall).not.toHaveBeenCalled();
    expect(f.events).toEqual([]);
  });
  it('checks the approved payload before looking up the provider call', async () => {
    const f = await proxyFixture();
    for (const change of [{ AccountSid: `AC${'f'.repeat(32)}` }, { From: '+15125550199' },
      { To: '+15125550199' }, { Direction: 'outbound-api' }, { CallSid: 'invalid' }]) {
      expect((await f.post(`${prefix}/inbound`, change)).statusCode).toBe(403);
    }
    expect(f.lookupCall).not.toHaveBeenCalled();
  });
  it('fails closed for lookup failures, inactive calls, stale calls and mismatched provider metadata', async () => {
    const f = await proxyFixture();
    f.lookupCall.mockRejectedValueOnce(new Error('provider unavailable'));
    expect((await f.post()).statusCode).toBe(403);
    for (const change of [{ sid: `CA${'f'.repeat(32)}` }, { accountSid: `AC${'f'.repeat(32)}` },
      { from: '+15125550199' }, { to: '+15125550199' }, { direction: 'outbound-api' },
      { status: 'completed' }, { dateCreated: new Date(-120001) }, { dateCreated: new Date(6000) },
      { dateCreated: new Date(NaN) }]) {
      f.lookupCall.mockResolvedValueOnce({ ...provider, ...change });
      expect((await f.post()).statusCode).toBe(403);
    }
    expect(f.events).toEqual([]);
    expect(f.rejections).toContain('call_verification_failed');
    expect(f.rejections).toContain('provider_call_mismatch');
    expect(f.rejections).toContain('call_not_active');
  });
  it('enforces the same call budget and expiry for the proxy', async () => {
    const f = await proxyFixture();
    await f.post();
    const secondSid = `CA${'c'.repeat(32)}`;
    f.lookupCall.mockResolvedValueOnce({ ...provider, sid: secondSid });
    await f.post(`${prefix}/inbound`, { CallSid: secondSid });
    const thirdSid = `CA${'d'.repeat(32)}`;
    f.lookupCall.mockResolvedValueOnce({ ...provider, sid: thirdSid });
    expect((await f.post(`${prefix}/inbound`, { CallSid: thirdSid })).body).toContain('session has ended');
    f.advance(300001);
    f.lookupCall.mockClear();
    expect((await f.post()).body).toContain('session has ended');
    expect(f.lookupCall).not.toHaveBeenCalled();
    expect(f.events).toEqual(['call_received', 'call_received']);
  });
});
