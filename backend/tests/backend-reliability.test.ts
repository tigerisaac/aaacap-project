import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, generateKeyPairSync } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { ForwardingStore } from '../src/cloud/forwarding-store.js';
import { ForwardingLive } from '../src/cloud/forwarding-live.js';
import { enrollSharedRoute } from '../src/cloud/shared-routing.js';
import { SharedCallControl } from '../src/cloud/call-control.js';
import { callJobId } from '../src/cloud/call-jobs.js';
import { CallControlProvider } from '../src/cloud/call-control-provider.js';
import { enroll } from './enroll.js';
import { announcementAudio, CAPTURE_VOICEMAIL } from '../src/cloud/announcements.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('backend reliability recovery', () => {
  const project = 'demo-shield-reliability', admin = initializeApp({ projectId: project }, 'reliability'), db = getFirestore(admin);
  const keys = generateKeyPairSync('ed25519');
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app', TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64),
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64'),
    TELNYX_ACCOUNT_ID: randomUUID(), TELNYX_APPLICATION_ID: '123456789', TELNYX_SHARED_APPLICATION_ID: '987654321', TELNYX_NUMBER: '+12025550999',
    LIVE_SCREENING_ENABLED: true, SHARED_NUMBER_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-test.a.run.app' });
  const people = Array.from({ length: 1 }, (_, n) => ({ id: randomUUID(), uid: `senior-${n}`, phone: `+120255501${String(n).padStart(2, '0')}`, shieldNumber: config.TELNYX_NUMBER }));
  let now: number, s: CloudStore, f: ForwardingStore, cc: SharedCallControl, provider: CallControlProvider;
  const action = vi.fn(), request = vi.fn();
  const event = (sid: string, type: string, patch: Record<string, unknown> = {}) => ({ id: randomUUID(), event_type: type, occurred_at: new Date(now).toISOString(),
    payload: { call_control_id: sid, call_leg_id: `leg-${sid}`, connection_id: config.TELNYX_SHARED_APPLICATION_ID!, ...(type === 'call.playback.ended' ? { status: 'completed' } : {}), ...patch } });
  const incoming = (sid: string, n: number, patch: Record<string, unknown> = {}) => event(sid, 'call.initiated', { direction: 'incoming', from: '+12025550888', to: config.TELNYX_NUMBER,
    sip_headers: [{ name: 'Diversion', value: `<tel:${people[n]!.phone}>` }], ...patch });
  const approve = { action: 'approve', reason: 'routine', purpose: 'personal', evidence: 'lunch tomorrow', hasName: true, hasReason: true } as const;
  const prepare = vi.fn().mockResolvedValue(undefined);
  async function arrive(n = 0, legacy = false) {
    const sid = randomUUID(); await cc.handle(incoming(sid, n)); const c = (await f.find(sid))!;
    // Retain explicit coverage of calls already in flight during a rolling release.
    if (legacy) { await s.callRef(c.id).update({ startupVersion: FieldValue.delete() }); await cc.answer((await cc.call(c.id))!); }
    else await cc.runJob(callJobId(c.id, 'start'));
    return (await f.find(sid))!;
  }
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
    for (const p of people) await enrollSharedRoute(s, p.id, { version: randomUUID(), carrier: 'tmobile', qualifiedAt: now });
    action.mockReset().mockResolvedValue({}); request.mockReset().mockImplementation(async () => ({ call_control_id: randomUUID() }));
    provider = new CallControlProvider(config); provider.action = action; provider.request = request; prepare.mockReset().mockResolvedValue(undefined); cc = new SharedCallControl(s, provider, prepare);
  });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });
  it.each(['dial rejection', 'recipient hangup', 'recipient decline'] as const)('durably retries voicemail after %s and a failed announcement', async cause => {
    const c = cause === 'dial rejection' ? await arrive() : await offer();
    if (cause === 'dial rejection') {
      const live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve);
      await cc.runJob(callJobId(c.id, 'outcome'));
      request.mockRejectedValue(new Error('telnyx_http_403'));
    } else if (cause === 'recipient decline') {
      await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    }
    const trigger = cause === 'dial rejection'
      ? event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') })
      : cause === 'recipient hangup' ? event(c.childSid!, 'call.hangup', { client_state: provider.state(c.id, 'recipient') })
      : event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '2' });
    let attempts = 0;
    const commands: string[] = [];
    action.mockImplementation(async (_sid, name, body) => {
      if (name === 'playback_start' && body.client_state === provider.state(c.id, 'voicemail')) {
        commands.push(body.command_id); attempts++;
        if (attempts < 3) throw new Error('telnyx_http_503');
      }
      return {};
    });
    await expect(cc.handle(trigger)).rejects.toThrow('telnyx_http_503');
    const jobId = callJobId(c.id, 'voicemail'), jobRef = db.collection('callControlJobs').doc(jobId);
    expect((await jobRef.get()).data()).toMatchObject({ phase: 'voicemail', callId: c.id });
    // No second provider webhook is required. A fresh worker recovers the committed state.
    const worker = new SharedCallControl(s, provider, prepare);
    await expect(worker.runJob(jobId)).rejects.toThrow('telnyx_http_503');
    expect((await jobRef.get()).data()?.done).not.toBe(true);
    await worker.runJob(jobId);
    expect(attempts).toBe(3); expect(new Set(commands).size).toBe(1);
    expect((await jobRef.get()).data()?.done).toBe(true);
    await cc.handle(trigger); await worker.runJob(jobId);
    expect(attempts).toBe(3);
    expect(request.mock.calls.filter(x => x[0] === '/calls')).toHaveLength(1);
    expect(action.mock.calls.some(x => x[1] === 'bridge' || x[1] === 'record_stop')).toBe(false);
    expect((await cc.call(c.id))!).toMatchObject({ state: 'voicemail', captureFromAnswer: true });
    expect(action).toHaveBeenCalledWith(c.parentSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(CAPTURE_VOICEMAIL)!.url }));
  });
  it.each(['completed prompt', 'caller hangup'] as const)('ignores a late voicemail job after %s without extending the timer', async finish => {
    request.mockRejectedValue(new Error('telnyx_http_403'));
    const c = await offer(), jobId = callJobId(c.id, 'voicemail');
    if (finish === 'completed prompt') await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'voicemail') }));
    else await cc.handle(event(c.parentSid, 'call.hangup'));
    const deadline = (await db.collection('callControlDeadlines').doc(c.id).get()).data();
    action.mockClear(); now += 5000;
    await new SharedCallControl(s, provider, prepare).runJob(jobId);
    expect(action).not.toHaveBeenCalled();
    expect((await db.collection('callControlDeadlines').doc(c.id).get()).data()).toEqual(deadline);
    expect((await cc.call(c.id))!.state).toBe(finish === 'caller hangup' ? 'ended' : 'voicemail');
  });
  it('drains multiple expiry pages, skips retained contacts and preserves historical totals', async () => {
    const write = db.bulkWriter(), person = people[0]!;
    for (let n = 0; n < 805; n++) {
      const key = String(n).padStart(4, '0');
      write.set(db.collection('callControlEvents').doc(key), { expiresAt: now - 1 });
      write.set(s.personRef(person.id).collection('blocked-numbers').doc(key), { expiresAt: now - 1 });
      write.set(db.collection('alertContacts').doc(key), { status: n < 400 ? 'accepted' : 'pending', expiresAt: now - 1 });
      write.set(s.callRef(key), { id: key, participantId: person.id, outcome: 'held', events: [], expiresAt: now - 1 });
    }
    for (const collection of ['callControlEvents', 'callSessions', 'alertContacts']) write.set(db.collection(collection).doc('fresh'), { expiresAt: now + 1000 });
    await write.close();
    await s.cleanup();
    expect((await db.collection('callControlEvents').get()).docs.map(d => d.id)).toEqual(['fresh']);
    expect((await db.collection('callSessions').get()).docs.map(d => d.id)).toEqual(['fresh']);
    expect((await s.personRef(person.id).collection('blocked-numbers').count().get()).data().count).toBe(0);
    expect((await db.collection('alertContacts').count().get()).data().count).toBe(401);
    expect((await s.personRef(person.id).collection('statistics').doc('stoppedCalls').get()).data()?.total).toBe(805);
    await s.cleanup();
    expect((await s.personRef(person.id).collection('statistics').doc('stoppedCalls').get()).data()?.total).toBe(805);
  }, 30_000);
});
