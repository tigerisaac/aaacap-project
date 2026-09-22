import type { Store } from './store.js';
import type { Telephony } from './telephony.js';
import { terminal } from './telephony.js';
import type { Notifier } from './notifications.js';
import type { Row } from './db.js';

export class Worker {
  private running = false;
  constructor(private readonly store: Store, private readonly telephony: Telephony, private readonly notifier: Notifier) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.reconcileDeadlines();
      await this.expireData();
      for (let i = 0; i < 12; i++) { if (!await this.runOne()) break; }
    } finally { this.running = false; }
  }

  async runOne(): Promise<boolean> {
    const job = (await this.store.db.query(`WITH candidate AS (
      SELECT id FROM jobs WHERE (status='pending' AND available_at<=now()) OR (status='running' AND locked_at<now()-interval '1 minute')
      ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE jobs SET status='running',attempts=attempts+1,locked_at=now()
      FROM candidate WHERE jobs.id=candidate.id RETURNING jobs.*`)).rows[0];
    if (!job) return false;
    try {
      await this.execute(job);
      await this.store.db.query("UPDATE jobs SET status='done',last_error=NULL WHERE id=$1", [job.id]);
    } catch {
      // Provider error bodies may contain telephone numbers or credentials. Store only a fixed category.
      const exhausted = job.attempts >= 8;
      await this.store.db.query("UPDATE jobs SET status=$2,last_error='provider_operation_failed',available_at=now()+($3 * interval '1 second') WHERE id=$1", [job.id, exhausted ? 'failed' : 'pending', Math.min(300, 2 ** job.attempts)]);
      if (exhausted && job.kind === 'ingest_recording') {
        await this.store.db.query("UPDATE voicemails SET status='failed' WHERE id=$1 AND status='pending'", [job.payload.voicemailId]);
      }
    }
    return true;
  }

  private async execute(job: Row): Promise<void> {
    const payload = job.payload;
    if (job.kind === 'notify') return this.notifier.notify(payload.participantId);
    if (job.kind === 'cancel_children') {
      const session = await this.store.session(payload.sessionId);
      if (!session) return;
      const children = await this.telephony.children(session.original_sid);
      for (const child of children) if (!terminal(child.status)) await this.telephony.end(child.sid);
      for (const child of children) if (!terminal((await this.telephony.call(child.sid)).status)) throw new Error('call_not_terminal');
      if (!children.length && !terminal((await this.telephony.call(session.original_sid)).status)) throw new Error('parent_still_active');
      await this.store.db.transaction(async tx => {
        await tx.query('SELECT id FROM participants WHERE id=$1 FOR UPDATE', [session.participant_id]);
        await tx.query('UPDATE call_sessions SET child_terminal=true WHERE id=$1', [session.id]);
        await this.store.release(tx, session.participant_id, session.id);
      });
      return;
    }
    if (job.kind === 'ingest_recording') {
      const row = (await this.store.db.query('SELECT v.*,c.original_sid FROM voicemails v JOIN call_sessions c ON c.id=v.session_id WHERE v.id=$1', [payload.voicemailId])).rows[0];
      if (!row || row.status === 'deleting' || new Date(row.expires_at).getTime() <= Date.now()) return;
      if (row.status !== 'ready') {
        const bytes = await this.telephony.recording(row.recording_sid, row.original_sid);
        const encrypted = this.store.vault.seal(bytes, `voicemail:${row.id}`);
        await this.store.db.transaction(async tx => {
          const result = await tx.query("UPDATE voicemails SET status='ready',audio_enc=$2 WHERE id=$1 AND status IN ('pending','failed') AND expires_at>now() RETURNING id", [row.id, encrypted]);
          if (result.rows.length) await this.store.job(tx, 'notify', `voicemail:${row.id}`, { participantId: row.participant_id });
          await this.store.job(tx, 'purge_provider_recording', `purge:${row.recording_sid}`, { recordingSid: row.recording_sid });
        });
      }
      return;
    }
    if (job.kind === 'purge_provider_recording' || job.kind === 'delete_recording') {
      await this.telephony.deleteRecording(payload.recordingSid);
      if (job.kind === 'delete_recording') await this.store.db.query('DELETE FROM voicemails WHERE id=$1', [payload.voicemailId]);
      return;
    }
    throw new Error('unsupported_job');
  }

  async reconcileDeadlines(): Promise<void> {
    const sessions = (await this.store.db.query("SELECT * FROM call_sessions WHERE state <> 'ended' AND deadline < now() ORDER BY deadline LIMIT 20")).rows;
    for (const session of sessions) {
      try {
        await this.telephony.end(session.original_sid);
        await this.store.db.transaction(async tx => {
          await tx.query('SELECT id FROM participants WHERE id=$1 FOR UPDATE', [session.participant_id]);
          const result = await tx.query(`UPDATE call_sessions SET state='ended',completed_at=now(),
            reason=CASE WHEN accepted_at IS NULL THEN 'expired' ELSE reason END,
            outcome=CASE WHEN outcome IN ('screening','offered') THEN 'missed' ELSE outcome END
            WHERE id=$1 AND state <> 'ended' AND deadline<now() RETURNING id`, [session.id]);
          if (!result.rows.length) return;
          await this.store.event(tx, session.id, 'ended');
          if (session.callback_attempted) await this.store.job(tx, 'cancel_children', `cancel:${session.id}`, { sessionId: session.id });
        });
      } catch {
        // Keep the participant lock. A provider outage is not evidence that the call ended.
        await this.store.audit(this.store.db, session.participant_id, 'call_reconciliation_failed', { sessionId: session.id });
      }
    }
  }

  async expireData(): Promise<void> {
    await this.store.db.transaction(async tx => {
      const expired = (await tx.query("UPDATE voicemails SET status='deleting',audio_enc=NULL WHERE expires_at<now() AND status <> 'deleting' RETURNING *")).rows;
      for (const row of expired) await this.store.job(tx, 'delete_recording', `delete:${row.recording_sid}`, { recordingSid: row.recording_sid, voicemailId: row.id });
      await tx.query(`DELETE FROM call_sessions c WHERE c.expires_at<now() AND c.state='ended'
        AND NOT EXISTS(SELECT 1 FROM participants p WHERE p.active_call_id=c.id)
        AND NOT EXISTS(SELECT 1 FROM voicemails v WHERE v.session_id=c.id)`);
      await tx.query("DELETE FROM jobs WHERE status='done' AND created_at<now()-interval '30 days'");
      await tx.query("DELETE FROM daily_usage WHERE day<CURRENT_DATE-30");
      await tx.query("DELETE FROM audit_events WHERE created_at<now()-interval '30 days'");
      await tx.query('DELETE FROM caregiver_grants WHERE accepted_at IS NULL AND expires_at<now()');
    });
  }
}
