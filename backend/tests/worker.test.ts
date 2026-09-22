import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers.js';
import { DEMO_PERSON, syntheticSid } from '../src/demo.js';

describe('durable recording and retention jobs', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeAll(async () => { f = await fixture(); });
  beforeEach(async () => { await f.reset(); });
  afterAll(async () => { await f.app.close(); });

  it('encrypts a recording before scheduling deletion of the provider copy', async () => {
    const call = await f.begin();
    await f.store.event(f.store.db, call.id, 'voicemail_offered');
    f.gateway.recording = async () => Buffer.from('private synthetic voicemail bytes');
    const recordingSid = syntheticSid('RE', randomUUID());
    const params = { CallSid: call.original, RecordingSid: recordingSid, RecordingStatus: 'completed', RecordingDuration: '7' };
    await f.postVoice(`/voice/recording-ready?session=${call.id}`, params);
    await f.postVoice(`/voice/recording-ready?session=${call.id}`, params);
    expect((await f.store.db.query('SELECT * FROM voicemails')).rows).toHaveLength(1);
    expect((await f.store.db.query("SELECT * FROM jobs WHERE kind='ingest_recording'")).rows).toHaveLength(1);
    await f.worker.runOne();
    const row = (await f.store.db.query('SELECT * FROM voicemails')).rows[0]!;
    expect(row.status).toBe('ready'); expect(row.audio_enc).not.toContain('private synthetic');
    expect(f.store.vault.open(row.audio_enc, `voicemail:${row.id}`)).toBe('private synthetic voicemail bytes');
    expect((await f.store.db.query("SELECT * FROM jobs WHERE kind='purge_provider_recording'")).rows).toHaveLength(1);
  });
  it('does not register a recording belonging to a different original leg', async () => {
    const call = await f.begin(); await f.store.event(f.store.db, call.id, 'voicemail_offered');
    await f.postVoice(`/voice/recording-ready?session=${call.id}`, { CallSid: syntheticSid('CA', 'wrong'), RecordingSid: syntheticSid('RE', 'wrong'), RecordingStatus: 'completed', RecordingDuration: '5' });
    expect((await f.store.db.query('SELECT * FROM voicemails')).rows).toHaveLength(0);
  });
  it('makes expired media inaccessible and enqueues durable deletion', async () => {
    const call = await f.begin(); const id = randomUUID(); const recordingSid = syntheticSid('RE', id);
    await f.store.db.query(`INSERT INTO voicemails(id,participant_id,session_id,recording_sid,duration,status,audio_enc,expires_at)
      VALUES($1,$2,$3,$4,7,'ready',$5,now()-interval '1 second')`, [id, DEMO_PERSON, call.id, recordingSid, f.store.vault.seal('audio', `voicemail:${id}`)]);
    await f.worker.expireData();
    const row = (await f.store.db.query('SELECT * FROM voicemails WHERE id=$1', [id])).rows[0]!;
    expect(row.status).toBe('deleting'); expect(row.audio_enc).toBeNull();
    await f.worker.runOne();
    expect(f.gateway.deletedRecordings).toContain(recordingSid);
    expect((await f.store.db.query('SELECT * FROM voicemails WHERE id=$1', [id])).rows).toHaveLength(0);
  });
  it('retains a failed provider operation for retry instead of dropping it', async () => {
    await f.store.job(f.store.db, 'cancel_children', 'failure-test', { sessionId: (await f.offer()).id });
    f.gateway.children = async () => { throw new Error('synthetic provider error including sensitive content'); };
    await f.worker.runOne();
    const job = (await f.store.db.query("SELECT * FROM jobs WHERE dedupe_key='failure-test'")).rows[0]!;
    expect(job.status).toBe('pending'); expect(job.attempts).toBe(1);
    expect(job.last_error).toBe('provider_operation_failed');
  });
});
