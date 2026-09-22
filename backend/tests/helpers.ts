import { randomUUID } from 'node:crypto';
import twilio from 'twilio';
import { loadConfig } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { seedDemo, DEMO_PERSON, DEMO_SECOND_PERSON, syntheticSid } from '../src/demo.js';
import { DemoTelephony } from '../src/telephony.js';
import { ManagedAuth } from '../src/auth.js';
import type { Extraction, Screener } from '../src/screening.js';

export const routine: Extraction = {
  purpose: 'appointment', sensitiveAccountIssue: { value: 'absent', evidence: null },
  familyMoneyEmergency: { value: 'absent', evidence: null }, prohibitedRequests: [], uncertainty: []
};

export async function fixture() {
  const config = loadConfig({ NODE_ENV: 'test', SHIELD_MODE: 'demo', EMBEDDED_DB_PATH: ':memory:',
    DATA_ENCRYPTION_KEY: 'ab'.repeat(32), DEMO_ACCESS_TOKEN: 'test-token-'.repeat(4),
    TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32), TWILIO_AUTH_TOKEN: 'only-a-synthetic-test-secret', MODEL_TIMEOUT_MS: '500' });
  const gateway = new DemoTelephony();
  let extraction = structuredClone(routine);
  const screener: Screener = { version: 'test-extractor', async extract() { return extraction; } };
  class TestAuth extends ManagedAuth {
    override async identify(token: string) { if (token === 'other-test-token') return { subject: 'demo-other' }; return super.identify(token); }
  }
  const built = await buildApp(config, { logger: false, telephony: gateway, screener, auth: new TestAuth(config), notifier: { async notify() {} } });
  await seedDemo(built.store);
  const auth = (person = DEMO_PERSON) => ({ authorization: `Bearer ${person === DEMO_SECOND_PERSON ? 'other-test-token' : config.DEMO_ACCESS_TOKEN}` });
  const caregiver = () => ({ authorization: `Bearer ${config.DEMO_ACCESS_TOKEN}.caregiver`, 'x-shield-participant': DEMO_PERSON });
  const postVoice = async (path: string, params: Record<string, string>, signed = true) => {
    const body = { AccountSid: config.TWILIO_ACCOUNT_SID, ...params };
    return built.app.inject({ method: 'POST', url: path, headers: { 'content-type': 'application/x-www-form-urlencoded',
      ...(signed ? { 'x-twilio-signature': twilio.getExpectedTwilioSignature(config.TWILIO_AUTH_TOKEN, `${config.PUBLIC_BASE_URL}${path}`, body) } : {}) }, payload: new URLSearchParams(body).toString() });
  };
  const begin = async () => {
    const original = syntheticSid('CA', randomUUID());
    gateway.calls.set(original, { sid: original, from: '+15125550199', to: '+15125550110', parentSid: null, status: 'in-progress' });
    const response = await postVoice('/voice/inbound', { CallSid: original, From: '+15125550199', To: '+15125550110' });
    const id = (await built.store.db.query('SELECT id FROM call_sessions WHERE original_sid=$1', [original])).rows[0]?.id as string;
    return { original, id, response };
  };
  const offer = async () => {
    const call = await begin();
    const response = await postVoice(`/voice/screening-result?session=${call.id}`, { CallSid: call.original, SpeechResult: 'I am calling to remind you about an appointment tomorrow.' });
    const child = syntheticSid('CA', randomUUID());
    gateway.calls.set(child, { sid: child, from: '+15125550110', to: '+15125550100', parentSid: call.original, status: 'in-progress' });
    return { ...call, child, offerResponse: response };
  };
  const reset = async () => {
    extraction = structuredClone(routine); gateway.calls.clear(); gateway.ended.length = 0;
    await built.store.db.query('TRUNCATE jobs,voicemails,call_events,call_sessions,daily_usage,trusted_numbers,push_devices');
    await built.store.db.query("UPDATE participants SET active_call_id=NULL,guard_until=NULL,status='active',last_routing_test_at=now()");
    await built.store.db.query("UPDATE service_settings SET value='false' WHERE key='offers_paused'");
  };
  return { ...built, config, gateway, auth, caregiver, begin, offer, reset, postVoice,
    setExtraction: (value: Extraction) => { extraction = value; } };
}
