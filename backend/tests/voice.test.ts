import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fixture, routine } from './helpers.js';
import { DEMO_PERSON, syntheticSid } from '../src/demo.js';

describe('signed voice lifecycle', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeAll(async () => { f = await fixture(); });
  beforeEach(async () => { await f.reset(); });
  afterAll(async () => { await f.app.close(); });

  it('rejects unsigned webhooks without creating a call', async () => {
    const res = await f.postVoice('/voice/inbound', { CallSid: syntheticSid('CA', 'unsigned'), From: '+15125550199', To: '+15125550110' }, false);
    expect(res.statusCode).toBe(403); expect(res.body).toContain('<Hangup/>');
    expect((await f.store.db.query('SELECT * FROM call_sessions')).rows).toHaveLength(0);
  });
  it('does not restart duplicate inbound calls', async () => {
    const c = await f.begin(); expect(c.response.body).toContain('<Gather');
    const again = await f.postVoice('/voice/inbound', { CallSid: c.original, From: '+15125550199', To: '+15125550110' });
    expect(again.body).toContain('<Hangup/>');
    expect((await f.store.db.query('SELECT * FROM call_sessions')).rows).toHaveLength(1);
  });
  it('honors the shared classification budget before offering a routine call', async () => {
    await f.store.db.query('INSERT INTO daily_usage(key,used) VALUES($1,$2)', ['classifications:global', f.config.MAX_CLASSIFICATIONS_PER_DAY]);
    const call = await f.offer();
    expect(call.offerResponse.body).toContain('<Record');
    expect(call.offerResponse.body).not.toContain('<Dial');
    expect((await f.store.session(call.id))?.reason).toBe('limit_reached');
  });
  it('does not claim voicemail was offered when the incoming-call capacity was exceeded', async () => {
    await f.store.db.query('INSERT INTO daily_usage(key,used) VALUES($1,$2)', [`screenings:${DEMO_PERSON}`, f.config.MAX_SCREENINGS_PER_PARTICIPANT_DAY]);
    const call = await f.begin();
    expect(call.response.body).not.toContain('<Record');
    expect((await f.store.session(call.id))?.outcome).toBe('missed');
    expect((await f.store.session(call.id))?.reason).toBe('capacity_exceeded');
  });
  it('sets the saved caller ID and bridges only after private acceptance', async () => {
    const c = await f.offer();
    expect(c.offerResponse.body).toContain('callerId="+15125550110"');
    expect(c.offerResponse.body).toContain('record="do-not-record"');
    const whisper = await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    expect(whisper.body).toContain('actionOnEmptyResult="true"'); expect(whisper.body).toContain('identity is not verified');
    const accepted = await f.postVoice(`/voice/accept?session=${c.id}`, { CallSid: c.child, Digits: '1' });
    expect(accepted.body).not.toContain('Hangup');
    expect((await f.store.session(c.id))?.accepted_at).toBeTruthy();
    expect((await f.store.session(c.id))?.outcome).toBe('connected');
  });
  it.each(['', '2', '9'])('never connects digit %j', async digit => {
    const c = await f.offer(); await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    const res = await f.postVoice(`/voice/accept?session=${c.id}`, { CallSid: c.child, Digits: digit });
    expect(res.body).toContain('Hangup'); expect((await f.store.session(c.id))?.accepted_at).toBeNull();
    const original = await f.postVoice(`/voice/dial-complete?session=${c.id}`, { CallSid: c.original, DialCallSid: c.child, DialCallStatus: 'completed' });
    expect(original.body).toContain('<Record'); expect(original.body).not.toContain('<Dial');
  });
  it('does not accept tones from the original caller', async () => {
    const c = await f.offer(); await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    const res = await f.postVoice(`/voice/accept?session=${c.id}`, { CallSid: c.original, Digits: '1' });
    expect(res.body).toContain('Hangup'); expect((await f.store.session(c.id))?.accepted_at).toBeNull();
  });
  it('rejects a different parent or wrong callback destination', async () => {
    const c = await f.offer(); f.gateway.calls.get(c.child)!.to = '+15125550101';
    const res = await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    expect(res.body).toContain('Hangup'); expect((await f.store.session(c.id))?.state).toBe('offering');
  });
  it('has one durable callback attempt across duplicate screening responses', async () => {
    const c = await f.offer();
    const duplicate = await f.postVoice(`/voice/screening-result?session=${c.id}`, { CallSid: c.original, SpeechResult: 'appointment tomorrow' });
    expect(duplicate.body).not.toContain('<Dial');
    expect((await f.store.db.query("SELECT used FROM daily_usage WHERE key='callbacks:global'")).rows[0]?.used).toBe(1);
  });
  it('serializes concurrent callers and does not create a second offer', async () => {
    const [a, b] = await Promise.all([f.begin(), f.begin()]);
    const results = await Promise.all([a, b].map(c => f.postVoice(`/voice/screening-result?session=${c.id}`, { CallSid: c.original, SpeechResult: 'appointment tomorrow' })));
    expect(results.filter(result => result.body.includes('<Dial'))).toHaveLength(1);
    expect(results.filter(result => result.body.includes('<Record'))).toHaveLength(1);
  });
  it('blocks Shield-number recursion before screening', async () => {
    const res = await f.postVoice('/voice/inbound', { CallSid: syntheticSid('CA', 'loop'), From: '+15125550110', To: '+15125550110' });
    expect(res.body).toContain('Hangup'); expect(res.body).not.toContain('Gather');
  });
  it('routes a trusted missed number directly to voicemail', async () => {
    await f.app.inject({ method: 'POST', url: '/api/trusted-numbers', headers: f.auth(), payload: { label: 'Family', phone: '+15125550199' } });
    const c = await f.begin(); expect(c.response.body).toContain('<Record'); expect(c.response.body).not.toContain('<Gather');
  });
  it('does not offer a sensitive-account claim', async () => {
    f.setExtraction({ ...routine, sensitiveAccountIssue: { value: 'present', evidence: 'account is frozen' } });
    const c = await f.begin();
    const res = await f.postVoice(`/voice/screening-result?session=${c.id}`, { CallSid: c.original, SpeechResult: 'Your bank account is frozen.' });
    expect(res.body).not.toContain('<Dial'); expect((await f.store.session(c.id))?.outcome).toBe('verification');
  });
  it('blocks after the original caller abandons, and cancels the child', async () => {
    const c = await f.offer(); await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    f.gateway.calls.get(c.original)!.status = 'completed';
    await f.postVoice('/voice/status', { CallSid: c.original, CallStatus: 'completed' });
    const res = await f.postVoice(`/voice/accept?session=${c.id}`, { CallSid: c.child, Digits: '1' });
    expect(res.body).toContain('Hangup'); await f.worker.tick();
    expect(f.gateway.ended).toContain(c.child);
    expect((await f.store.participant(DEMO_PERSON))?.active_call_id).toBeNull();
  });
  it('ignores late nonterminal child events without erasing acceptance', async () => {
    const c = await f.offer(); await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    await f.postVoice(`/voice/accept?session=${c.id}`, { CallSid: c.child, Digits: '1' });
    await f.postVoice(`/voice/child-status?session=${c.id}`, { CallSid: c.child, CallStatus: 'completed' });
    await f.postVoice(`/voice/child-status?session=${c.id}`, { CallSid: c.child, CallStatus: 'ringing' });
    const row = await f.store.session(c.id); expect(row?.child_terminal).toBe(true); expect(row?.accepted_at).toBeTruthy();
  });
  it('uses message-only behavior when a routing test is stale or offers are globally paused', async () => {
    await f.store.db.query("UPDATE participants SET last_routing_test_at=now()-interval '15 days'");
    expect((await f.begin()).response.body).toContain('<Record');
    await f.store.db.query('UPDATE participants SET last_routing_test_at=now()');
    await f.store.db.query("UPDATE service_settings SET value='true' WHERE key='offers_paused'");
    expect((await f.begin()).response.body).toContain('<Record');
  });
  it('does not trust lock expiry while a provider call remains unresolved', async () => {
    const c = await f.offer();
    await f.store.db.query("UPDATE call_sessions SET deadline=now()-interval '1 second' WHERE id=$1", [c.id]);
    f.gateway.calls.delete(c.original);
    await f.worker.reconcileDeadlines();
    expect((await f.store.participant(DEMO_PERSON))?.active_call_id).toBe(c.id);
    expect((await f.begin()).response.body).toContain('<Record');
  });
  it('refuses an expired private acceptance', async () => {
    const c = await f.offer(); await f.postVoice(`/voice/whisper?session=${c.id}`, { CallSid: c.child });
    await f.store.db.query("UPDATE call_sessions SET deadline=now()-interval '1 second' WHERE id=$1", [c.id]);
    expect((await f.postVoice(`/voice/accept?session=${c.id}`, { CallSid: c.child, Digits: '1' })).body).toContain('Hangup');
  });
});
