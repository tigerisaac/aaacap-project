import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { normalizePhone } from './crypto.js';
import { HttpError, accessFor, bearer, requireOwner, type AuthProvider, type Identity, type Access } from './auth.js';
import { Store, iso } from './store.js';
import type { Row } from './db.js';
import { purposes, reasonCopy, screen, type Screener } from './screening.js';
import { CONSENT_VERSION } from './voice.js';

const idSchema = z.string().uuid();
const contactSchema = z.object({ label: z.string().trim().min(1).max(60), phone: z.string().min(8).max(25) });
const destinationSchema = contactSchema.extend({ provenance: z.enum(['card', 'statement', 'official_website', 'known_person']) });
const getId = (request: FastifyRequest) => idSchema.parse((request.params as { id: string }).id);

export function callDTO(store: Store, row: Row): Record<string, unknown> {
  const copy = reasonCopy[row.reason] ?? reasonCopy.uncertain!;
  return {
    id: row.id, occurredAt: iso(row.created_at), callerNumber: store.caller(row),
    title: row.purpose && row.reason === 'routine' ? purposes[row.purpose as keyof typeof purposes] : copy.title,
    outcome: row.outcome, reasonCode: row.reason, detail: copy.detail, nextStep: copy.action,
    acceptedAt: iso(row.accepted_at), endedAt: iso(row.completed_at),
    voicemail: row.voicemail_id ? { id: row.voicemail_id, duration: row.duration, status: row.voicemail_status, heardAt: iso(row.heard_at) } : null
  };
}

export async function registerAPI(app: FastifyInstance, store: Store, auth: AuthProvider, screener: Screener): Promise<void> {
  const identify = async (request: FastifyRequest): Promise<Identity> => auth.identify(bearer(request));
  const access = async (request: FastifyRequest): Promise<Access> => {
    const selected = request.headers['x-shield-participant'];
    if (Array.isArray(selected)) throw new HttpError(400, 'invalid_person');
    return accessFor(store, await identify(request), selected);
  };
  const own = async (request: FastifyRequest): Promise<Access> => { const ctx = await access(request); requireOwner(ctx); return ctx; };
  const limit = async (key: string, count: number) => {
    if (!await store.quota(store.db, key, count)) throw new HttpError(429, 'daily_limit_reached');
  };
  const callSelect = `SELECT c.*,v.id AS voicemail_id,v.duration,v.status AS voicemail_status,v.heard_at
    FROM call_sessions c LEFT JOIN LATERAL (SELECT * FROM voicemails WHERE session_id=c.id AND status <> 'deleting' ORDER BY created_at DESC LIMIT 1) v ON true`;

  app.get('/public/config', async () => ({ mode: store.config.SHIELD_MODE, consentVersion: CONSENT_VERSION,
    signInMethod: store.config.AUTH_PROVIDER === 'firebase' ? 'email-link' : 'email-code',
    supportEmail: store.config.SUPPORT_EMAIL || null, messageFilteringAvailable: store.config.SMS_CLASSIFICATION_ENABLED,
    notificationsAvailable: !!store.config.APNS_PRIVATE_KEY && !!store.config.APNS_KEY_ID && !!store.config.APNS_TEAM_ID,
    privacyPath: '/privacy', termsPath: '/service-info' }));
  app.post('/auth/request-code', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async request => {
    const { email } = z.object({ email: z.string().email().max(254) }).parse(request.body);
    await limit(`auth-ip:${store.vault.hash(request.ip)}`, 30);
    await limit(`auth-email:${store.vault.hash(email.trim().toLowerCase())}`, 5);
    await limit('auth:global', 200);
    await auth.requestCode(email);
    return { sent: true };
  });
  app.post('/auth/verify-code', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async request => {
    const codeSchema = store.config.AUTH_PROVIDER === 'firebase'
      ? z.string().min(16).max(2048).regex(/^[a-zA-Z0-9_-]+$/) : z.string().regex(/^\d{6,8}$/);
    const { email, code } = z.object({ email: z.string().email().max(254), code: codeSchema }).parse(request.body);
    await limit(`verify-ip:${store.vault.hash(request.ip)}`, 50);
    await limit(`verify-email:${store.vault.hash(email.trim().toLowerCase())}`, 20);
    return auth.verifyCode(email, code);
  });
  app.post('/auth/refresh', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async request => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(10).max(4096) }).parse(request.body);
    return auth.refresh(refreshToken);
  });
  app.post('/auth/logout', async request => {
    const identity = await identify(request);
    await store.db.query('DELETE FROM push_devices WHERE auth_subject=$1', [identity.subject]);
    await auth.logout(bearer(request));
    return { signedOut: true };
  });

  app.get('/api/people', async request => {
    const identity = await identify(request);
    const people = (await store.db.query(`SELECT p.*,true AS is_owner,true AS can_listen FROM participants p WHERE auth_subject=$1 AND status <> 'offboarded'
      UNION ALL SELECT p.*,false AS is_owner,g.can_listen FROM participants p JOIN caregiver_grants g ON g.participant_id=p.id
      WHERE g.grantee_subject=$1 AND g.revoked_at IS NULL AND g.accepted_at IS NOT NULL AND p.status <> 'offboarded'`, [identity.subject])).rows;
    return { people: people.map(person => ({ id: person.id, name: store.name(person), isOwner: person.is_owner, canListen: person.can_listen })), isDemo: store.config.SHIELD_MODE === 'demo' };
  });

  app.get('/api/overview', async request => {
    const ctx = await access(request); const participant = ctx.participant;
    const counts = (await store.db.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE outcome IN ('held','verification'))::int AS held,
      count(*) FILTER (WHERE outcome='connected')::int AS connected,
      count(*) FILTER (WHERE EXISTS(SELECT 1 FROM voicemails v WHERE v.session_id=c.id AND v.status <> 'deleting'))::int AS messages
      FROM call_sessions c WHERE participant_id=$1 AND created_at >= now()-interval '7 days'`, [participant.id])).rows[0];
    const recent = (await store.db.query(`${callSelect} WHERE c.participant_id=$1 ORDER BY c.created_at DESC,c.id DESC LIMIT 6`, [participant.id])).rows;
    return { name: store.name(participant), status: participant.status, lastTestAt: iso(participant.last_routing_test_at),
      isDemo: store.config.SHIELD_MODE === 'demo', isOwner: ctx.isOwner, canListen: ctx.canListen,
      counts, recent: recent.map(row => callDTO(store, row)) };
  });

  app.get('/api/calls', async request => {
    const ctx = await access(request);
    const query = z.object({ filter: z.enum(['all', 'held', 'connected', 'voicemail']).default('all'), cursor: z.string().max(500).optional() }).parse(request.query);
    let cursor: { at: string; id: string } | undefined;
    if (query.cursor) {
      try { cursor = z.object({ at: z.string().datetime(), id: idSchema }).parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString())); }
      catch { throw new HttpError(400, 'invalid_cursor'); }
    }
    const filter = query.filter === 'held' ? "AND c.outcome IN ('held','verification')" : query.filter === 'connected' ? "AND c.outcome='connected'" : query.filter === 'voicemail' ? 'AND v.id IS NOT NULL' : '';
    const rows = (await store.db.query(`${callSelect} WHERE c.participant_id=$1 ${filter}
      ${cursor ? 'AND (c.created_at,c.id) < ($2::timestamptz,$3::uuid)' : ''} ORDER BY c.created_at DESC,c.id DESC LIMIT 31`, cursor ? [ctx.participant.id, cursor.at, cursor.id] : [ctx.participant.id])).rows;
    const page = rows.slice(0, 30); const last = page.at(-1);
    return { calls: page.map(row => callDTO(store, row)), nextCursor: rows.length > 30 && last ? Buffer.from(JSON.stringify({ at: iso(last.created_at), id: last.id })).toString('base64url') : null };
  });
  app.get('/api/calls/:id', async request => {
    const ctx = await access(request); const id = getId(request);
    const row = (await store.db.query(`${callSelect} WHERE c.id=$1 AND c.participant_id=$2`, [id, ctx.participant.id])).rows[0];
    if (!row) throw new HttpError(404, 'call_not_found');
    const events = (await store.db.query('SELECT kind,happened_at FROM call_events WHERE session_id=$1 ORDER BY happened_at,id', [id])).rows;
    return { call: callDTO(store, row), events: events.map(event => ({ kind: event.kind, at: iso(event.happened_at) })) };
  });

  app.get('/api/voicemails/:id/audio', async (request, reply) => {
    const ctx = await access(request); if (!ctx.canListen) throw new HttpError(403, 'voicemail_not_shared');
    const row = (await store.db.query("SELECT * FROM voicemails WHERE id=$1 AND participant_id=$2 AND status='ready' AND expires_at>now()", [getId(request), ctx.participant.id])).rows[0];
    if (!row?.audio_enc) throw new HttpError(404, 'recording_unavailable');
    await store.audit(store.db, ctx.participant.id, 'voicemail_accessed', { voicemailId: row.id, caregiver: !ctx.isOwner });
    return reply.header('Cache-Control', 'no-store').type('audio/mpeg').send(store.vault.openBytes(row.audio_enc, `voicemail:${row.id}`));
  });
  app.post('/api/voicemails/:id/heard', async request => {
    const ctx = await access(request); if (!ctx.canListen) throw new HttpError(403, 'voicemail_not_shared');
    await store.db.query('UPDATE voicemails SET heard_at=now() WHERE id=$1 AND participant_id=$2', [getId(request), ctx.participant.id]);
    return { updated: true };
  });
  app.delete('/api/voicemails/:id', async request => {
    const ctx = await own(request); const id = getId(request);
    await store.db.transaction(async tx => {
      const row = (await tx.query("UPDATE voicemails SET status='deleting',audio_enc=NULL WHERE id=$1 AND participant_id=$2 RETURNING *", [id, ctx.participant.id])).rows[0];
      if (!row) throw new HttpError(404, 'recording_unavailable');
      await store.job(tx, 'delete_recording', `delete:${row.recording_sid}`, { recordingSid: row.recording_sid, voicemailId: id });
    });
    return { deleted: true };
  });

  app.get('/api/setup', async request => {
    const ctx = await own(request); const p = ctx.participant;
    const profile = p.carrier_profile_id ? (await store.db.query('SELECT * FROM carrier_profiles WHERE id=$1', [p.carrier_profile_id])).rows[0] : undefined;
    return { participantId: p.id, name: store.name(p), phone: store.phone(p), shieldNumber: p.did,
      status: p.status, isOwner: ctx.isOwner, consentVersion: CONSENT_VERSION, consented: p.consent_version === CONSENT_VERSION,
      phoneVerified: !!p.phone_verified_at, lastTestAt: iso(p.last_routing_test_at), restoredAt: iso(p.restored_at), routingTestUntil: iso(p.routing_test_until),
      liveServiceEnabled: store.config.SHIELD_MODE === 'live' && store.config.LIVE_OFFERING_ENABLED,
      carrierProfile: profile ? { id: profile.id, name: profile.name, configuration: profile.configuration,
        validatedAt: iso(profile.validated_at), activationSteps: profile.activation_steps, restorationSteps: profile.restoration_steps } : null,
      supportEmail: store.config.SUPPORT_EMAIL || null };
  });
  app.post('/api/setup/consent', async request => {
    const ctx = await own(request);
    const { version, accepted } = z.object({ version: z.literal(CONSENT_VERSION), accepted: z.literal(true) }).parse(request.body);
    if (accepted) await store.db.transaction(async tx => {
      await tx.query('UPDATE participants SET consent_version=$2,consented_at=now() WHERE id=$1', [ctx.participant.id, version]);
      await store.audit(tx, ctx.participant.id, 'consent_recorded', { version });
    });
    return { recorded: true };
  });
  app.post('/api/setup/pause', async request => {
    const ctx = await own(request); const { paused } = z.object({ paused: z.boolean() }).parse(request.body);
    await store.db.transaction(async tx => {
      const p = (await tx.query('SELECT * FROM participants WHERE id=$1 FOR UPDATE', [ctx.participant.id])).rows[0]!;
      if (!['active', 'paused'].includes(p.status)) throw new HttpError(409, 'setup_incomplete');
      if (!paused && (!p.last_routing_test_at || p.consent_version !== CONSENT_VERSION || Date.now() - new Date(p.last_routing_test_at).getTime() > 14 * 86400000)) throw new HttpError(409, 'routing_test_required');
      await tx.query('UPDATE participants SET status=$2 WHERE id=$1', [p.id, paused ? 'paused' : 'active']);
      await store.audit(tx, p.id, paused ? 'offers_paused' : 'offers_resumed');
    });
    return { paused };
  });
  const restore = async (request: FastifyRequest, deletion: boolean) => {
    const ctx = await own(request);
    await store.db.transaction(async tx => {
      await tx.query(`UPDATE participants SET status='restoring',routing_test_until=NULL,restoration_requested_at=COALESCE(restoration_requested_at,now())
        ${deletion ? ',deletion_requested_at=COALESCE(deletion_requested_at,now())' : ''} WHERE id=$1`, [ctx.participant.id]);
      await store.audit(tx, ctx.participant.id, deletion ? 'deletion_requested' : 'restoration_requested');
    });
    return { requested: true, requiresRoutingRestoration: true };
  };
  app.post('/api/setup/restore', async request => restore(request, false));
  app.post('/api/account/delete', async request => restore(request, true));

  for (const kind of ['trusted-numbers', 'destinations'] as const) {
    const table = kind === 'trusted-numbers' ? 'trusted_numbers' : 'destinations';
    app.get(`/api/${kind}`, async request => {
      const ctx = await own(request);
      const rows = (await store.db.query(`SELECT * FROM ${table} WHERE participant_id=$1 ORDER BY created_at DESC`, [ctx.participant.id])).rows;
      return { items: rows.map(row => ({ id: row.id, label: store.vault.open(row.label_enc, `${table}:${row.id}:label`),
        phone: store.vault.open(row.phone_enc, `${table}:${row.id}:phone`), provenance: row.provenance ?? null, createdAt: iso(row.created_at) })) };
    });
    app.post(`/api/${kind}`, async request => {
      const ctx = await own(request); const data = (kind === 'destinations' ? destinationSchema : contactSchema).parse(request.body);
      const phone = normalizePhone(data.phone); if (!phone) throw new HttpError(400, 'invalid_phone');
      const count = Number((await store.db.query(`SELECT count(*) AS n FROM ${table} WHERE participant_id=$1`, [ctx.participant.id])).rows[0]?.n);
      if (count >= 100) throw new HttpError(409, 'contact_limit');
      const id = randomUUID();
      await store.db.query(`INSERT INTO ${table}(id,participant_id,label_enc,phone_enc,${kind === 'destinations' ? 'provenance' : 'phone_hash'}) VALUES($1,$2,$3,$4,$5)`,
        [id, ctx.participant.id, store.vault.seal(data.label, `${table}:${id}:label`), store.vault.seal(phone, `${table}:${id}:phone`),
          'provenance' in data ? data.provenance : store.vault.hash(phone)]);
      return { id };
    });
    app.delete(`/api/${kind}/:id`, async request => {
      const ctx = await own(request); await store.db.query(`DELETE FROM ${table} WHERE id=$1 AND participant_id=$2`, [getId(request), ctx.participant.id]);
      return { deleted: true };
    });
  }

  app.get('/api/sharing', async request => {
    const ctx = await own(request);
    const rows = (await store.db.query('SELECT * FROM caregiver_grants WHERE participant_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC', [ctx.participant.id])).rows;
    return { grants: rows.map(row => ({ id: row.id, label: store.vault.open(row.label_enc, `grant:${row.id}:label`), canListen: row.can_listen,
      accepted: !!row.accepted_at, expiresAt: iso(row.expires_at) })) };
  });
  app.post('/api/sharing', async request => {
    const ctx = await own(request);
    const data = z.object({ label: z.string().trim().min(1).max(60), canListen: z.boolean(), consent: z.literal(true) }).parse(request.body);
    await limit(`invites:${ctx.participant.id}`, 10);
    const id = randomUUID(); const code = randomBytes(24).toString('base64url');
    await store.db.transaction(async tx => {
      await tx.query("INSERT INTO caregiver_grants(id,participant_id,token_hash,label_enc,can_listen,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '2 days')", [id, ctx.participant.id, store.vault.hash(code), store.vault.seal(data.label, `grant:${id}:label`), data.canListen]);
      await store.audit(tx, ctx.participant.id, 'sharing_invited', { grantId: id, canListen: data.canListen });
    });
    return { id, code };
  });
  app.post('/api/sharing/accept', async request => {
    const identity = await identify(request); const { code } = z.object({ code: z.string().min(20).max(100) }).parse(request.body);
    await limit(`invite-accept:${store.vault.hash(identity.subject)}`, 20);
    const participantId = await store.db.transaction(async tx => {
      const grant = (await tx.query('SELECT * FROM caregiver_grants WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE', [store.vault.hash(code)])).rows[0];
      if (!grant) throw new HttpError(404, 'invite_unavailable');
      const participant = await store.participant(grant.participant_id, tx);
      if (!participant || participant.auth_subject === identity.subject || participant.status === 'offboarded') throw new HttpError(409, 'invite_unavailable');
      await tx.query('UPDATE caregiver_grants SET grantee_subject=$2,accepted_at=now() WHERE id=$1', [grant.id, identity.subject]);
      await store.audit(tx, participant.id, 'sharing_accepted', { grantId: grant.id });
      return participant.id;
    });
    return { participantId };
  });
  app.delete('/api/sharing/:id', async request => {
    const ctx = await own(request); const id = getId(request);
    await store.db.transaction(async tx => {
      const row = (await tx.query('UPDATE caregiver_grants SET revoked_at=now() WHERE id=$1 AND participant_id=$2 RETURNING grantee_subject', [id, ctx.participant.id])).rows[0];
      if (row?.grantee_subject) await tx.query('DELETE FROM push_devices WHERE participant_id=$1 AND auth_subject=$2', [ctx.participant.id, row.grantee_subject]);
      await store.audit(tx, ctx.participant.id, 'sharing_revoked', { grantId: id });
    });
    return { revoked: true };
  });

  app.post('/api/check', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async request => {
    const identity = await identify(request); const { text } = z.object({ text: z.string().trim().min(3).max(6000), analysisConsent: z.literal(true) }).parse(request.body);
    await limit(`manual:${store.vault.hash(identity.subject)}`, 30);
    await limit('classifications:global', store.config.MAX_CLASSIFICATIONS_PER_DAY);
    const decision = await screen(screener, text, store.config.MODEL_TIMEOUT_MS);
    const copy = reasonCopy[decision.reason] ?? reasonCopy.uncertain!;
    const messageCopy: Record<string, [string, string]> = {
      routine: ['Check independently', 'No listed sensitive request was detected. This does not establish who sent the message.'],
      prohibited_request: ['Don’t act on this yet', 'The check detected a request involving sensitive information, device access, money, or secrecy.'],
      sensitive_issue: ['Verify independently', 'This message describes an account or money issue. Contact the organization through a number you already know.'],
      family_emergency: ['Check with someone you know', 'This message describes a family emergency involving money. Contact your relative independently.'],
      uncertain: ['Not enough information', 'The check could not reliably understand this text. Verify independently before responding.'],
      screening_unavailable: ['Check unavailable', 'The check did not finish. This message has not been assessed.']
    };
    const [title, detail] = messageCopy[decision.reason] ?? messageCopy.uncertain!;
    return { decision: decision.route, reasonCode: decision.reason, title, detail,
      nextStep: decision.route === 'refuse' || decision.route === 'verify' ? copy.action : 'Contact the sender through a number or app you already trust.',
      isDemo: store.config.SHIELD_MODE === 'demo' };
  });

  app.post('/api/devices', async request => {
    const ctx = await access(request); const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64,200}$/i) }).parse(request.body);
    const hash = store.vault.hash(token);
    await store.db.query(`INSERT INTO push_devices(participant_id,auth_subject,token_enc,token_hash) VALUES($1,$2,$3,$4)
      ON CONFLICT(participant_id,token_hash) DO UPDATE SET auth_subject=EXCLUDED.auth_subject,token_enc=EXCLUDED.token_enc`, [ctx.participant.id, ctx.identity.subject, store.vault.seal(token, `push:${ctx.participant.id}:${hash}`), hash]);
    return { registered: true };
  });
}
