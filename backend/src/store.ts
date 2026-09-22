import { randomUUID } from 'node:crypto';
import type { Config } from './config.js';
import type { Database, Queryable, Row } from './db.js';
import { Vault } from './crypto.js';

export class Store {
  constructor(readonly db: Database, readonly vault: Vault, readonly config: Config) {}
  async participant(id: string, tx: Queryable = this.db): Promise<Row | undefined> {
    return (await tx.query('SELECT * FROM participants WHERE id=$1', [id])).rows[0];
  }
  async bySubject(subject: string): Promise<Row | undefined> {
    return (await this.db.query('SELECT * FROM participants WHERE auth_subject=$1 AND status <> $2', [subject, 'offboarded'])).rows[0];
  }
  async session(id: string, tx: Queryable = this.db): Promise<Row | undefined> {
    return (await tx.query('SELECT * FROM call_sessions WHERE id=$1', [id])).rows[0];
  }
  phone(participant: Row): string { return this.vault.open(participant.phone_enc, `participant:${participant.id}:phone`); }
  name(participant: Row): string { return this.vault.open(participant.name_enc, `participant:${participant.id}:name`); }
  caller(session: Row): string { return this.vault.open(session.caller_enc, `call:${session.id}:caller`); }
  async event(tx: Queryable, sessionId: string, kind: string): Promise<void> {
    await tx.query('INSERT INTO call_events(id,session_id,kind) VALUES($1,$2,$3) ON CONFLICT(session_id,kind) DO NOTHING', [randomUUID(), sessionId, kind]);
  }
  async audit(tx: Queryable, participantId: string | null, kind: string, detail: Record<string, unknown> = {}): Promise<void> {
    await tx.query('INSERT INTO audit_events(id,participant_id,kind,detail) VALUES($1,$2,$3,$4)', [randomUUID(), participantId, kind, JSON.stringify(detail)]);
  }
  async job(tx: Queryable, kind: string, key: string, payload: Record<string, unknown>): Promise<void> {
    await tx.query('INSERT INTO jobs(id,kind,dedupe_key,payload) VALUES($1,$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING', [randomUUID(), kind, key, JSON.stringify(payload)]);
  }
  async quota(tx: Queryable, key: string, limit: number): Promise<boolean> {
    const { rows } = await tx.query(`INSERT INTO daily_usage(key,used) VALUES($1,1)
      ON CONFLICT(key,day) DO UPDATE SET used=daily_usage.used+1 WHERE daily_usage.used < $2 RETURNING used`, [key, limit]);
    return rows.length === 1;
  }
  async release(tx: Queryable, participantId: string, sessionId: string): Promise<void> {
    await tx.query(`UPDATE participants SET active_call_id=NULL, guard_until=now()+interval '60 seconds'
      WHERE id=$1 AND active_call_id=$2`, [participantId, sessionId]);
  }
}

export const iso = (value: unknown): string | null => value ? new Date(value as string).toISOString() : null;
