import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Fastify from 'fastify';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { ForwardingStore } from '../src/cloud/forwarding-store.js';
import { ForwardingLive } from '../src/cloud/forwarding-live.js';
import { forwardingIdentity, enrollSharedRoute, routeRef } from '../src/cloud/shared-routing.js';
import { SharedCallControl, registerCallControl } from '../src/cloud/call-control.js';
import { CallControlProvider } from '../src/cloud/call-control-provider.js';
import { registerSignedFormBody } from '../src/cloud/form-body.js';
import { SharedProbes } from '../src/cloud/shared-probes.js';
import { ForwardingProbes } from '../src/cloud/forwarding-probes.js';
import { enroll } from './enroll.js';
import { announcementAudio, ANNOUNCEMENT_BACKUP_VOICE, CAPTURE_GREETING, CAPTURE_VOICEMAIL, SOUND_CHECK_MESSAGE } from '../src/cloud/announcements.js';
import { CallMonitor, warningText } from '../src/cloud/monitoring.js';

it('accepts one normalized forwarding identity and rejects missing, malformed, conflicting, or injected headers', () => {
  expect(forwardingIdentity([{ name: 'Diversion', value: '<sip:+12025550101@carrier.example>;reason=no-answer' }])).toBe('+12025550101');
  expect(forwardingIdentity([{ name: 'diversion', value: '<tel:2025550101>, <sip:12025550101@carrier.example>' }])).toBe('+12025550101');
  for (const headers of [undefined, [], [{ name: 'Diversion', value: '<tel:+12025550101>, <tel:+12025550102>' }],
    [{ name: 'Diversion', value: '<sip:+12025550101@carrier.example>\r\nx: y' }], [{ name: 'Diversion', value: '<tel:%2B12025550101>' }],
    [{ name: 'From', value: '<tel:+12025550101>' }], [{ name: 'Diversion', value: '<tel:911>' }]]) expect(forwardingIdentity(headers)).toBeUndefined();
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Ten seniors on one shared number', () => {
  const project = 'demo-shield-shared', admin = initializeApp({ projectId: project }, 'shared-pilot'), db = getFirestore(admin);
  const keys = generateKeyPairSync('ed25519');
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app', TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64),
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64'),
    TELNYX_ACCOUNT_ID: randomUUID(), TELNYX_APPLICATION_ID: '123456789', TELNYX_SHARED_APPLICATION_ID: '987654321', TELNYX_NUMBER: '+12025550999',
    LIVE_SCREENING_ENABLED: true, SHARED_NUMBER_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-test.a.run.app' });
  const people = Array.from({ length: 11 }, (_, n) => ({ id: randomUUID(), uid: `senior-${n}`, phone: `+120255501${String(n).padStart(2, '0')}`, shieldNumber: config.TELNYX_NUMBER }));
  let now: number, s: CloudStore, f: ForwardingStore, cc: SharedCallControl, provider: CallControlProvider;
  const action = vi.fn(), request = vi.fn();
  const event = (sid: string, type: string, patch: Record<string, unknown> = {}) => ({ id: randomUUID(), event_type: type, occurred_at: new Date(now).toISOString(),
    payload: { call_control_id: sid, call_leg_id: `leg-${sid}`, connection_id: config.TELNYX_SHARED_APPLICATION_ID!, ...(type === 'call.playback.ended' ? { status: 'completed' } : {}), ...patch } });
  const incoming = (sid: string, n: number, patch: Record<string, unknown> = {}) => event(sid, 'call.initiated', { direction: 'incoming', from: '+12025550888', to: config.TELNYX_NUMBER,
    sip_headers: [{ name: 'Diversion', value: `<tel:${people[n]!.phone}>` }], ...patch });
  const approve = { action: 'approve', reason: 'routine', purpose: 'personal', evidence: 'lunch tomorrow', hasName: true, hasReason: true } as const;
  async function arrive(n = 0) { const sid = randomUUID(); await cc.handle(incoming(sid, n)); return (await f.find(sid))!; }
  async function offer(n = 0) {
    const c = await arrive(n), live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve); await cc.outcome(c.id);
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') }));
    return (await f.find(c.parentSid))!;
  }
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('local_emulator_required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.UTC(2026, 9, 12, 17); s = new CloudStore(db, config, () => now); f = new ForwardingStore(s);
    for (const p of people) await enroll(s, { ...p, now });
    await db.doc(`shieldNumbers/${config.TELNYX_NUMBER}`).set({ state: 'shared', members: [] });
    for (const p of people.slice(0, 10)) await enrollSharedRoute(s, p.id, { version: randomUUID(), carrier: 'tmobile', qualifiedAt: now });
    action.mockReset().mockResolvedValue({}); request.mockReset().mockImplementation(async () => ({ call_control_id: randomUUID() }));
    provider = new CallControlProvider(config); provider.action = action; provider.request = request; cc = new SharedCallControl(s, provider);
  });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });
  it('enforces the ten-person enrollment cap and never reassigns an existing forwarding identity', async () => {
    await expect(enrollSharedRoute(s, people[10]!.id, { version: randomUUID(), carrier: 'verizon', qualifiedAt: now })).rejects.toThrow('pilot_full');
    await s.personRef(people[10]!.id).update({ phoneEnc: s.vault.seal(people[0]!.phone, `person:${people[10]!.id}:phone`) });
    await expect(enrollSharedRoute(s, people[10]!.id, { version: randomUUID(), carrier: 'verizon', qualifiedAt: now })).rejects.toThrow('route_quarantined');
  });
  it('admits ten simultaneous seniors from the same caller, then refuses an eleventh live leg', async () => {
    const calls = await Promise.all(people.slice(0, 10).map((p, n) => f.begin(randomUUID(), config.TELNYX_NUMBER, '+12025550888', { diverted: p.phone, legId: `leg-${n}` })));
    expect(calls.every(c => c?.state === 'screening')).toBe(true);
    expect(new Set(calls.map(c => c?.participantId)).size).toBe(10);
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'extra' })).toBeUndefined();
    await f.ended(calls[0]!.parentSid);
    expect((await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'replacement' }))?.participantId).toBe(people[0]!.id);
  });
  it('does not fall back to the caller, another senior, or a shared voicemail when metadata is absent', async () => {
    const sid = randomUUID(); await cc.handle(incoming(sid, 0, { from: people[0]!.phone, sip_headers: [] }));
    expect(await f.find(sid)).toBeUndefined(); expect(action).toHaveBeenCalledWith(sid, 'hangup', expect.anything());
    expect(action.mock.calls.some(c => c[1] === 'answer')).toBe(false);
  });
  it('pins the verified recipient even when the participant phone record later changes', async () => {
    const c = await arrive(); const ends = f.callEndpoints(c);
    await s.personRef(c.participantId).update({ phoneEnc: s.vault.seal(people[1]!.phone, `person:${c.participantId}:phone`) });
    expect(f.callEndpoints((await cc.call(c.id))!)).toEqual(ends);
  });
  it('deduplicates retries and binds only the intended recipient before press-1 bridging', async () => {
    const c = await offer(), child = c.childSid!;
    const answered = event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') });
    await cc.handle(answered); await cc.handle(answered);
    expect(action.mock.calls.filter(x => x[1] === 'gather_using_audio')).toHaveLength(1);
    expect(action).toHaveBeenCalledWith(child, 'gather_using_audio', expect.objectContaining({ audio_url: expect.stringContaining('/offer-personal.wav') }));
    expect(action.mock.calls.some(x => x[1] === 'speak' || x[1] === 'gather_using_speak')).toBe(false);
    await cc.handle(event(randomUUID(), 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
    const accept = event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' });
    await cc.handle(accept); await cc.handle(accept);
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(1);
    expect(action).toHaveBeenCalledWith(child, 'bridge', expect.objectContaining({ call_control_id: c.parentSid, prevent_double_bridge: true }));
    const stopIndex = action.mock.calls.findIndex(x => x[0] === c.parentSid && x[1] === 'record_stop');
    expect(stopIndex).toBeGreaterThan(-1); expect(stopIndex).toBeLessThan(action.mock.calls.findIndex(x => x[1] === 'bridge'));
    expect(request).toHaveBeenCalledWith('/calls', expect.objectContaining({ to: people[0]!.phone, from: config.TELNYX_NUMBER, time_limit_secs: 3600 }));
  });
  it('keeps an accepted call and its capacity beyond five minutes, then ends it at the hour', async () => {
    const c = await offer(), child = c.childSid!;
    await cc.handle(event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const acceptedAt = now;
    const deadline = db.doc(`callControlDeadlines/${c.id}`);
    expect((await deadline.get()).data()?.dueAt).toBe(acceptedAt + 3600_000);
    now += 8 * 60_000; await cc.sweep();
    expect((await cc.call(c.id))?.state).toBe('accepted');
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'during-long-call' })).toBeUndefined();
    now = acceptedAt + 3600_000; await cc.sweep();
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
  });
  it('plays Grace before starting screening, and ignores old TTS completion callbacks', async () => {
    const c = await arrive();
    await cc.handle(event(c.parentSid, 'call.answered'));
    expect(action).toHaveBeenCalledWith(c.parentSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(CAPTURE_GREETING)!.url, audio_type: 'wav' }));
    await cc.handle(event(c.parentSid, 'call.speak.ended', { client_state: provider.state(c.id, 'greeting'), status: 'completed' }));
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
    const ended = event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting') });
    await cc.handle(ended); await cc.handle(ended);
    expect(action.mock.calls.filter(x => x[1] === 'streaming_start')).toHaveLength(1);
  });
  it.each(['failed', 'file_not_found', 'unknown'])('retries a failed Grace greeting once with Joanna (%s), then waits for completion', async status => {
    const c = await arrive(); await cc.handle(event(c.parentSid, 'call.answered'));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting'), status }));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting'), status }));
    expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
    expect(action).toHaveBeenCalledWith(c.parentSid, 'speak', expect.objectContaining({ payload: CAPTURE_GREETING, voice: ANNOUNCEMENT_BACKUP_VOICE }));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting') }));
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
    await cc.handle(event(c.parentSid, 'call.speak.ended', { client_state: provider.state(c.id, 'greeting-backup'), status: 'completed' }));
    expect(action.mock.calls.filter(x => x[1] === 'streaming_start')).toHaveLength(1);
  });
  it('never advances a canceled prompt or an unsuccessful backup', async () => {
    const c = await arrive(); await cc.handle(event(c.parentSid, 'call.answered'));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting'), status: 'cancelled' }));
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect(action.mock.calls.some(x => x[1] === 'speak' || x[1] === 'streaming_start')).toBe(false);
    const other = await arrive(1); await cc.handle(event(other.parentSid, 'call.answered'));
    await cc.handle(event(other.parentSid, 'call.playback.ended', { client_state: provider.state(other.id, 'greeting'), status: 'failed' }));
    await cc.handle(event(other.parentSid, 'call.speak.ended', { client_state: provider.state(other.id, 'greeting-backup'), status: 'cancelled_amd' }));
    expect((await cc.call(other.id))?.state).toBe('ended');
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
  });
  it('uses Joanna after a definite provider rejection, but retries uncertain playback without switching voices', async () => {
    const c = await arrive(); action.mockRejectedValueOnce(new Error('telnyx_http_422'));
    await cc.handle(event(c.parentSid, 'call.answered'));
    expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
    const other = await arrive(1), answer = event(other.parentSid, 'call.answered');
    action.mockRejectedValueOnce(new Error('timeout'));
    await expect(cc.handle(answer)).rejects.toThrow('timeout'); await cc.handle(answer);
    const plays = action.mock.calls.filter(x => x[0] === other.parentSid && x[1] === 'playback_start');
    expect(plays).toHaveLength(2); expect(plays[0]![2].command_id).toBe(plays[1]![2].command_id);
    expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
  });
  it('waits for the Joanna hold disclosure before dialing after Grace fails', async () => {
    const c = await arrive(), live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve); await cc.outcome(c.id);
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer'), status: 'file_not_found' }));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') }));
    expect(request).not.toHaveBeenCalled();
    await cc.handle(event(c.parentSid, 'call.speak.ended', { client_state: provider.state(c.id, 'offer-backup'), status: 'completed' }));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('cannot accept a late primary gather after falling back, and still requires press 1 on the bound recipient', async () => {
    const c = await offer(), child = c.childSid!; await cc.handle(event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(child, 'call.playback.ended', { client_state: provider.state(c.id, 'accept'), status: 'failed' }));
    expect(action).toHaveBeenCalledWith(child, 'gather_using_speak', expect.objectContaining({ voice: ANNOUNCEMENT_BACKUP_VOICE, minimum_digits: 1, maximum_digits: 1 }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    await cc.handle(event(c.parentSid, 'call.gather.ended', { client_state: provider.state(c.id, 'accept-backup'), digits: '1' }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept-backup'), digits: '1', status: 'cancelled' }));
    expect(action.mock.calls.some(x => x[1] === 'bridge')).toBe(false);
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept-backup'), digits: '1' }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(1);
  });
  it('preserves a legitimate keypad interruption of Grace and the no-tone captured voicemail prompt', async () => {
    const c = await offer(), child = c.childSid!; await cc.handle(event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(child, 'call.playback.ended', { client_state: provider.state(c.id, 'accept'), status: 'cancelled' }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '2' }));
    expect(action).toHaveBeenCalledWith(c.parentSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(CAPTURE_VOICEMAIL)!.url }));
    expect(action.mock.calls.some(x => x[1] === 'speak' || x[1] === 'gather_using_speak' || x[1] === 'bridge')).toBe(false);
  });
  it('plays the monitoring warning with Grace, with Joanna only after media failure', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const warningAction = vi.spyOn(CallControlProvider.prototype, 'action').mockResolvedValue({});
    try {
      await new CallMonitor(f).intervene(c.id, 'secrecy');
      expect(warningAction).toHaveBeenCalledWith(c.childSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(warningText('secrecy'))!.url }));
      expect(warningAction.mock.calls.some(x => x[1] === 'speak')).toBe(false);
      await cc.handle(event(c.childSid!, 'call.playback.ended', { client_state: provider.state(c.id, 'warning'), status: 'file_not_found' }));
      expect(action).toHaveBeenCalledWith(c.childSid, 'speak', expect.objectContaining({ payload: warningText('secrecy'), voice: ANNOUNCEMENT_BACKUP_VOICE }));
      await cc.handle(event(c.childSid!, 'call.speak.ended', { client_state: provider.state(c.id, 'warning-backup'), status: 'completed' }));
      expect(action).toHaveBeenCalledWith(c.childSid, 'hangup', expect.anything());
    } finally { warningAction.mockRestore(); }
  });
  it('defaults the sound check to Grace and only confirms the active backup gather after failure', async () => {
    const probe = (await new ForwardingProbes(s).reserve(people[0]!.id, 'ring'))!, child = randomUUID();
    await cc.handle(event(child, 'call.initiated', { from: config.TELNYX_NUMBER, to: people[0]!.phone, client_state: provider.state(probe.id, 'probe-ring') }));
    await cc.handle(event(child, 'call.answered', { client_state: provider.state(probe.id, 'probe-ring') }));
    expect(action).toHaveBeenCalledWith(child, 'gather_using_audio', expect.objectContaining({ audio_url: announcementAudio(SOUND_CHECK_MESSAGE)!.url }));
    await cc.handle(event(child, 'call.playback.ended', { client_state: provider.state(probe.id, 'probe-ring'), status: 'failed' }));
    expect(action).toHaveBeenCalledWith(child, 'gather_using_speak', expect.objectContaining({ payload: SOUND_CHECK_MESSAGE, voice: ANNOUNCEMENT_BACKUP_VOICE }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-ring'), digits: '1' }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-ring-backup'), digits: '1', status: 'cancelled' }));
    expect((await f.controlRef(people[0]!.id).get()).data()?.probe.state).toBe('waiting');
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-ring-backup'), digits: '1' }));
    expect((await f.controlRef(people[0]!.id).get()).data()?.probe.state).toBe('passed');
  });
  it('uses Joanna for a rejected warning audio command, and ends the recipient after its backup finishes', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const warningAction = vi.spyOn(CallControlProvider.prototype, 'action').mockImplementation(async (_sid, name) => {
      if (name === 'playback_start') throw new Error('telnyx_http_422');
      return {};
    });
    try {
      await new CallMonitor(f).intervene(c.id, 'remote_access');
      expect(warningAction).toHaveBeenCalledWith(c.childSid, 'speak', expect.objectContaining({ payload: warningText('remote_access'), voice: ANNOUNCEMENT_BACKUP_VOICE }));
      await cc.handle(event(c.childSid!, 'call.speak.ended', { client_state: provider.state(c.id, 'warning-backup'), status: 'completed' }));
      expect(action).toHaveBeenCalledWith(c.childSid, 'hangup', expect.anything());
    } finally { warningAction.mockRestore(); }
  });
  it('records from answer before the greeting, and a saved callback cannot hang up a connected call', async () => {
    const c = await offer();
    expect(action).toHaveBeenCalledWith(c.parentSid, 'answer', expect.objectContaining({ record: 'record-from-answer', record_track: 'inbound', record_max_length: 240 }));
    await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const before = action.mock.calls.filter(x => x[1] === 'hangup').length;
    await cc.handle(event(c.parentSid, 'call.recording.saved', { recording_id: randomUUID(), recording_started_at: new Date(now).toISOString(), recording_ended_at: new Date(now + 100_000).toISOString() }));
    expect(action.mock.calls.filter(x => x[1] === 'hangup')).toHaveLength(before);
    expect((await s.db.collection('forwardingRecordings').get()).docs[0]!.data()).toMatchObject({ capture: true, duration: 100 });
  });
  it('never bridges if stopping the temporary capture fails', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    action.mockImplementation(async (_sid, name) => { if (name === 'record_stop') throw new Error('capture_stop_failed'); return {}; });
    await expect(cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }))).rejects.toThrow('capture_stop_failed');
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
  });
  it('saves a notice outcome even when the recording hangs up first, without offering a live call', async () => {
    const c = await arrive(), live = new ForwardingLive(f); await live.claim(c.id);
    await cc.handle(event(c.parentSid, 'call.hangup'));
    await live.finish(c.id, { ...approve, action: 'message', reason: 'unclear' });
    expect((await cc.call(c.id))!).toMatchObject({ state: 'ended', outcome: 'voicemail', reason: 'automated_notice' });
    expect(action.mock.calls.some(x => x[1] === 'dial' || x[1] === 'bridge')).toBe(false);
  });
  it('never bridges rejection, silence, the inbound caller’s digit, or another person’s child leg', async () => {
    const a = await offer(0), b = await offer(1);
    await cc.handle(event(a.childSid!, 'call.answered', { client_state: provider.state(a.id, 'recipient') }));
    await cc.handle(event(a.parentSid, 'call.gather.ended', { client_state: provider.state(a.id, 'accept'), digits: '1' }));
    await cc.handle(event(b.childSid!, 'call.gather.ended', { client_state: provider.state(a.id, 'accept'), digits: '1' }));
    await cc.handle(event(a.childSid!, 'call.gather.ended', { client_state: provider.state(a.id, 'accept'), digits: '2' }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
    expect((await cc.call(a.id))?.state).toBe('voicemail');
  });
  it('accepts signed raw JSON only from the configured application', async () => {
    const app = Fastify(); registerSignedFormBody(app); await registerCallControl(app, s, provider);
    const e = incoming(randomUUID(), 0), body = JSON.stringify({ data: e }), timestamp = String(now / 1000);
    const headers = { 'content-type': 'application/json', 'telnyx-timestamp': timestamp, 'telnyx-signature-ed25519': sign(null, Buffer.from(`${timestamp}|${body}`), keys.privateKey).toString('base64') };
    expect((await app.inject({ method: 'POST', url: '/voice/shared', headers, payload: body + ' ' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/voice/shared', headers, payload: body })).statusCode).toBe(200);
    const wrong = JSON.stringify({ data: { ...e, payload: { ...e.payload, connection_id: config.TELNYX_APPLICATION_ID } } });
    headers['telnyx-signature-ed25519'] = sign(null, Buffer.from(`${timestamp}|${wrong}`), keys.privateKey).toString('base64');
    expect((await app.inject({ method: 'POST', url: '/voice/shared', headers, payload: wrong })).statusCode).toBe(403); await app.close();
  });
  it('handles hangup before initiation and never resurrects the call', async () => {
    const sid = randomUUID(); await cc.handle(event(sid, 'call.hangup')); await cc.handle(incoming(sid, 0));
    expect(await f.find(sid)).toBeUndefined(); expect(action).not.toHaveBeenCalled();
  });
  it('retries an uncertain answer with the same command id, but never redials an uncertain outbound call', async () => {
    const sid = randomUUID(), init = incoming(sid, 0); action.mockRejectedValueOnce(new Error('timeout'));
    await expect(cc.handle(init)).rejects.toThrow('timeout'); await cc.handle(init);
    expect(action.mock.calls[0]![2].command_id).toBe(action.mock.calls[1]![2].command_id);
    request.mockRejectedValue(new Error('timeout'));
    const c = (await f.find(sid))!, live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve); await cc.outcome(c.id);
    const e = event(sid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') });
    await cc.handle(e); await cc.handle(e); expect(request).toHaveBeenCalledTimes(1); expect((await cc.call(c.id))?.state).toBe('voicemail');
  });
  it('sweeps a crashed screening session without releasing capacity before successful hangup', async () => {
    const c = await arrive(); now += 91_000; action.mockRejectedValueOnce(new Error('network_down'));
    await expect(cc.sweep()).rejects.toThrow('shared_cleanup_incomplete'); expect((await cc.call(c.id))?.state).toBe('screening');
    now += 500_000;
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'while-uncertain' })).toBeUndefined();
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeDefined();
    await cc.sweep(); expect((await cc.call(c.id))?.state).toBe('ended');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
  });
  it('qualifies two simultaneous forwarding checks independently, never using another senior’s nonce', async () => {
    const probes = new ForwardingProbes(s), shared = new SharedProbes(s, provider);
    const a = (await probes.reserve(people[0]!.id, 'forwarding'))!, b = (await probes.reserve(people[1]!.id, 'forwarding'))!;
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false });
    await Promise.all([shared.start(a.id, config.TELNYX_NUMBER, people[0]!.phone), shared.start(b.id, config.TELNYX_NUMBER, people[1]!.phone)]);
    const outA = randomUUID(), outB = randomUUID(), inA = randomUUID(), inB = randomUUID();
    for (const [probe, n, sid] of [[a, 0, outA], [b, 1, outB]] as const) await cc.handle(event(sid, 'call.initiated', { direction: 'outgoing', from: config.TELNYX_NUMBER, to: people[n]!.phone, client_state: provider.state(probe.id, 'probe-forwarding') }));
    await cc.handle(incoming(inA, 0, { from: config.TELNYX_NUMBER })); await cc.handle(incoming(inB, 1, { from: config.TELNYX_NUMBER }));
    await cc.handle(event(inA, 'call.gather.ended', { client_state: provider.state(a.id, 'probe-inbound'), digits: b.nonce }));
    expect((await f.controlRef(people[0]!.id).get()).data()?.probe.state).toBe('waiting');
    await cc.handle(event(inB, 'call.gather.ended', { client_state: provider.state(b.id, 'probe-inbound'), digits: b.nonce }));
    expect((await f.controlRef(people[1]!.id).get()).data()?.probe.state).toBe('passed');
    expect((await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).get()).data()?.enabled).toBe(false);
    expect(action.mock.calls.some(x => x[1] === 'bridge')).toBe(false);
  });
  it('revoking a route or changing its verified phone prevents a pending offer from being accepted', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false });
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    expect(action.mock.calls.some(x => x[1] === 'bridge')).toBe(false);
  });
  it('does not let an in-flight forwarding check undo an operator revocation', async () => {
    const probes = new ForwardingProbes(s), probe = (await probes.reserve(people[0]!.id, 'forwarding'))!;
    const out = randomUUID(), incomingSid = randomUUID();
    await probes.outbound(probe.id, out); await probes.incoming(incomingSid, people[0]!.id);
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false, disabledAt: now, version: randomUUID() });
    await cc.handle(event(incomingSid, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-inbound'), digits: probe.nonce }));
    expect((await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).get()).data()?.enabled).toBe(false);
  });
  it('keeps the slot when the caller hangs up but recipient termination is uncertain', async () => {
    const c = await offer(), hangup = event(c.parentSid, 'call.hangup');
    action.mockRejectedValueOnce(new Error('network_down'));
    await expect(cc.handle(hangup)).rejects.toThrow('network_down');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeDefined();
    await cc.handle(hangup);
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
  });
  it('does not admit disabled or unverified routes', async () => {
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false });
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'x' })).toBeUndefined();
    await s.personRef(people[1]!.id).update({ phoneVerifiedAt: null });
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[1]!.phone, legId: 'y' })).toBeUndefined();
  });
});
