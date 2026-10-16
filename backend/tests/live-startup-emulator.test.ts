import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { expect, it } from 'vitest';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { ForwardingStore } from '../src/cloud/forwarding-store.js';
import { streamTicket } from '../src/cloud/forwarding-live.js';
import { enrollSharedRoute } from '../src/cloud/shared-routing.js';
import { callJobId } from '../src/cloud/call-jobs.js';
import { enroll } from './enroll.js';

/** Exercise the actual packaged HTTP/WebSocket server at capacity one. No provider/model calls. */
it.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('reuses a real bridge process after disconnect, missing start, and malformed media', async () => {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('local_emulator_required');
  const project = 'demo-shield-startup', admin = initializeApp({ projectId: project }, 'startup-server'), db = getFirestore(admin);
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64), TELNYX_API_KEY: 'test'.repeat(8),
    TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_ACCOUNT_ID: randomUUID(), TELNYX_APPLICATION_ID: '123456789',
    TELNYX_SHARED_APPLICATION_ID: '987654321', SHARED_NUMBER_ENABLED: true, LIVE_SCREENING_ENABLED: true,
    TELNYX_NUMBER: '+12025550999', LIVE_BRIDGE_URL: 'https://synthetic.a.run.app' });
  const s = new CloudStore(db, config), f = new ForwardingStore(s), person = { id: randomUUID(), uid: 'synthetic-startup', phone: '+12025550101', shieldNumber: config.TELNYX_NUMBER, now: Date.now() };
  const reservation = createServer(); await new Promise<void>(r => reservation.listen(0, '127.0.0.1', r));
  const port = (reservation.address() as { port: number }).port; await new Promise<void>(r => reservation.close(() => r()));
  const child = spawn(process.execPath, ['dist/live/server.js'], { stdio: 'ignore', env: { ...process.env,
    GCLOUD_PROJECT: project, GOOGLE_CLOUD_PROJECT: project, FIREBASE_CONFIG: JSON.stringify({ projectId: project }), PORT: String(port), SHIELD_RUNTIME: JSON.stringify(config),
    OPENAI_API_KEY: 'synthetic', SONIOX_API_KEY: 'synthetic', SHIELD_SCREENING_MODE: 'hybrid', LIVE_SESSIONS_PER_INSTANCE: '1' } });
  const sockets: WebSocket[] = [];
  try {
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    await enroll(s, person); await db.doc(`shieldNumbers/${config.TELNYX_NUMBER}`).set({ state: 'shared', members: [] });
    await enrollSharedRoute(s, person.id, { version: randomUUID(), carrier: 'tmobile', qualifiedAt: Date.now() });
    const base = `http://127.0.0.1:${port}`;
    await expect.poll(async () => { try { return (await (await fetch(`${base}/ready`)).json() as any).startupProtocol; } catch { return 0; } }, { timeout: 10_000 }).toBe(1);
    for (const failure of ['disconnect', 'missing-start', 'malformed', 'last-disconnect']) {
      const sid = randomUUID(), legId = randomUUID();
      const call = (await f.begin(sid, config.TELNYX_NUMBER, '+12025550888', { diverted: person.phone, legId }))!;
      expect(call.state).toBe('screening');
      const expiry = Date.now() + 60_000, token = streamTicket(config, call.id, expiry), path = `${call.id}/${expiry}/${token}`;
      expect((await fetch(`${base}/prepare/${path}`, { method: 'POST' })).status).toBe(200);
      const ws = new WebSocket(`ws://127.0.0.1:${port}/media/${path}`); sockets.push(ws);
      await once(ws, 'open');
      if (failure === 'disconnect' || failure === 'last-disconnect') ws.terminate();
      else if (failure === 'malformed') ws.send('null');
      // No valid start is sent, so the real server must never contact Soniox/OpenAI/Telnyx.
      await expect.poll(async () => (await s.callRef(call.id).get()).data()?.state, { timeout: 8000 }).toBe('voicemail');
      expect((await db.doc(`callControlJobs/${callJobId(call.id, 'outcome')}`).get()).exists).toBe(true);
      await f.unconnectedHangup(call.id, sid, legId);
      expect((await f.controlRef(person.id).get()).data()?.activeCallId).toBeUndefined();
      await expect.poll(() => ws.readyState).toBe(WebSocket.CLOSED);
      expect(child.exitCode).toBeNull();
    }
  } finally {
    for (const ws of sockets) ws.terminate(); child.kill();
    await once(child, 'exit'); await db.terminate(); await deleteApp(admin);
  }
}, 30_000);
