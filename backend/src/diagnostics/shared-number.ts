import { createHash, randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { z } from 'zod';
import { verifyTelnyx } from '../cloud/forwarding-provider.js';
import { requiredAnnouncementAudio, ROUTING_TEST_HOLD, ROUTING_TEST_MESSAGE } from '../cloud/announcements.js';

// Standalone operator diagnostic. No production routes import this module.
export const probeConfig = z.object({
  applicationId: z.string().regex(/^\d{5,30}$/),
  destination: z.string().regex(/^\+1[2-9]\d{9}$/),
  lineA: z.string().regex(/^\+1[2-9]\d{9}$/),
  lineB: z.string().regex(/^\+1[2-9]\d{9}$/),
  caseId: z.enum(['direct', 'no-answer', 'decline', 'busy', 'unreachable', 'silence', 'wifi', 'private', 'overlap', 'chain']),
  holdSeconds: z.number().int().min(20).max(120).default(120),
  maxCalls: z.number().int().min(2).max(100).default(40),
  maxConcurrent: z.number().int().min(2).max(10).default(2),
  // Only the maintenance supervisor supplies this after saving a restoration snapshot.
  productionTestUntil: z.number().int().optional(),
}).strict().superRefine((c, ctx) => {
  if (new Set([c.destination, c.lineA, c.lineB]).size !== 3) {
    ctx.addIssue({ code: 'custom', message: 'distinct_test_numbers_required' });
  }
  if (c.destination === '+15074731802' && (!c.productionTestUntil || c.productionTestUntil <= Date.now() || c.productionTestUntil > Date.now() + 30 * 60_000)) {
    ctx.addIssue({ code: 'custom', message: 'bounded_maintenance_window_required' });
  }
});
export type ProbeConfig = z.infer<typeof probeConfig>;
type Label = 'A' | 'B';
type Observation = { kind: 'missing' | 'unsupported' | 'ambiguous' | 'unregistered' | 'candidate'; candidate?: Label; entries: number };

function normalizeUS(value: string) {
  if (/^\+1[2-9]\d{9}$/.test(value)) return value;
  if (/^1[2-9]\d{9}$/.test(value)) return `+${value}`;
  if (/^[2-9]\d{9}$/.test(value)) return `+1${value}`;
  return undefined;
}

/** Conservative single-identity diagnostic, NOT a production SIP trust policy. */
export function observeDiversion(headers: unknown, config: Pick<ProbeConfig, 'lineA' | 'lineB'>): Observation {
  if (headers === undefined) return { kind: 'missing', entries: 0 };
  if (!Array.isArray(headers) || headers.length > 32) return { kind: 'unsupported', entries: 0 };
  const values: string[] = [];
  for (const h of headers) {
    if (!h || typeof h.name !== 'string') return { kind: 'unsupported', entries: 0 };
    if (h.name.toLowerCase() !== 'diversion') continue;
    if (typeof h.value !== 'string' || h.value.length > 2048 || /[\r\n]/.test(h.value)) return { kind: 'unsupported', entries: 0 };
    values.push(h.value);
  }
  if (!values.length) return { kind: 'missing', entries: 0 };
  // Commas in quoted display names are intentionally unsupported, not guessed around.
  const entries = values.flatMap(v => v.split(','));
  if (entries.length > 8) return { kind: 'unsupported', entries: entries.length };
  const numbers = new Set<string>();
  for (const entry of entries) {
    const match = entry.trim().match(/^(?:"[^"<>]*"\s*)?<((?:sips?|tel):[^<>]+)>(?:\s*;[^<>]*)?$/i)
      ?? entry.trim().match(/^((?:sips?|tel):[^<>]+)$/i);
    const uri = match?.[1];
    const address = uri?.match(/^(?:sips?:([+\d]+)@[a-z\d.:[\]-]+(?:;[^<>]*)?|tel:([+\d]+)(?:;[^<>]*)?)$/i);
    const number = normalizeUS(address?.[1] ?? address?.[2] ?? '');
    if (!number) return { kind: 'unsupported', entries: entries.length };
    numbers.add(number);
  }
  if (numbers.size !== 1) return { kind: 'ambiguous', entries: entries.length };
  const number = [...numbers][0];
  const candidate = number === config.lineA ? 'A' : number === config.lineB ? 'B' : undefined;
  return candidate ? { kind: 'candidate', candidate, entries: entries.length } : { kind: 'unregistered', entries: entries.length };
}

const eventSchema = z.object({ data: z.object({
  id: z.string().min(1).max(200), event_type: z.string().max(100), occurred_at: z.string().datetime({ offset: true }),
  payload: z.object({
    call_control_id: z.string().regex(/^[a-zA-Z0-9_:+/=-]{1,512}$/),
    call_leg_id: z.string().min(1).max(200), connection_id: z.string(),
    direction: z.string().optional(), to: z.string().optional(), sip_headers: z.unknown().optional(),
    digits: z.string().max(128).optional(),
  }),
}) });
type Event = z.infer<typeof eventSchema>['data'];
type Action = 'answer' | 'gather_using_audio' | 'playback_start' | 'hangup';
export type Command = (callId: string, action: Action, body: Record<string, unknown>) => Promise<void>;
type Row = {
  probeId: string; observation: Observation; expected?: Label | 'direct';
  result: string; initiatedAt: number; answeredAt?: number; endedAt?: number;
  errors: string[]; terminationRequested: boolean;
};
type Session = { row: Row; callId: string; legId: string; timer?: ReturnType<typeof setTimeout>; answerRequested: boolean; prompted: boolean; chain: Promise<void> };

export class SharedNumberProbe {
  private sessions = new Map<string, Session>();
  private events = new Set<string>();
  private endedBeforeStart = new Set<string>();
  private closing = false;
  private startedAt = Date.now();
  private failures = 0;
  private rejected = 0;
  constructor(readonly config: ProbeConfig, private command: Command, private changed: () => void = () => {}) {}

  report() {
    const rows = [...this.sessions.values()].map(s => structuredClone(s.row));
    // Only completed, correctly matched A/B calls with provider timestamps count.
    // A requested hangup or a missing webhook is not evidence of a closed interval.
    let overlapAB = false;
    const completed = rows.filter(r => r.result === 'MATCH' && !r.errors.length && r.answeredAt !== undefined && r.endedAt !== undefined && r.endedAt > r.answeredAt);
    for (const a of completed) for (const b of completed) {
      if (a.expected === 'A' && b.expected === 'B' && Math.min(a.endedAt!, b.endedAt!) > Math.max(a.answeredAt!, b.answeredAt!)) overlapAB = true;
    }
    return { version: 1, caseId: this.config.caseId, startedAt: new Date(this.startedAt).toISOString(),
      calls: rows.length, rejected: this.rejected, commandFailures: this.failures,
      confirmedMatchedOverlapAB: overlapAB, rows };
  }

  accept(input: unknown): number {
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) return 400;
    const e = parsed.data.data, p = e.payload;
    if (p.connection_id !== this.config.applicationId) return 403;
    if (this.events.has(e.id)) return 200;
    if (this.events.size >= 5000) return 503;
    if (!['call.initiated', 'call.answered', 'call.gather.ended', 'call.hangup'].includes(e.event_type)) return 200;
    let s = this.sessions.get(p.call_control_id);
    if (s && s.legId !== p.call_leg_id) return 403;
    if (!s && e.event_type !== 'call.initiated') {
      if (e.event_type === 'call.hangup') {
        if (this.endedBeforeStart.size >= 200) return 503;
        this.endedBeforeStart.add(p.call_control_id); this.events.add(e.id); return 200;
      }
      return 503; // Ask Telnyx to retry an event delivered ahead of initiation.
    }
    if (!s) {
      if (p.direction !== 'incoming' || normalizeUS(p.to ?? '') !== this.config.destination) return 403;
      // Ignore old initiations after a restart, rather than resurrecting a call.
      if (Date.parse(e.occurred_at) < this.startedAt - 5000 || this.endedBeforeStart.has(p.call_control_id)) return 200;
      const active = [...this.sessions.values()].filter(v => v.row.endedAt === undefined).length;
      if (this.closing || (this.config.productionTestUntil !== undefined && Date.now() >= this.config.productionTestUntil)
        || this.sessions.size >= this.config.maxCalls || active >= this.config.maxConcurrent) {
        this.rejected++; this.changed(); return 503; // Provider first-command timeout closes unanswered calls.
      }
      s = { callId: p.call_control_id, legId: p.call_leg_id, answerRequested: false, prompted: false, chain: Promise.resolve(), row: {
        probeId: randomUUID(), observation: observeDiversion(p.sip_headers, this.config),
        result: 'AWAITING_TESTER', initiatedAt: Date.parse(e.occurred_at), errors: [], terminationRequested: false,
      } };
      this.sessions.set(p.call_control_id, s);
      const session = s;
      session.timer = setTimeout(() => { void this.stop(session); }, this.config.holdSeconds * 1000);
      session.timer.unref();
    }
    this.events.add(e.id);
    // Per-call queues isolate state while allowing different calls to run concurrently.
    const session = s;
    session.chain = session.chain.then(() => this.process(session, e)).catch(async () => {
      session.row.errors.push('handler_failed'); await this.stop(session);
    });
    this.changed();
    return 200;
  }

  private async send(s: Session, action: Action, body: Record<string, unknown> = {}) {
    try {
      await this.command(s.callId, action, { ...body,
        command_id: createHash('sha256').update(`${s.callId}:${action}`).digest('hex'),
      });
      return true;
    } catch {
      this.failures++; s.row.errors.push(`${action}_failed`); this.changed(); return false;
    }
  }

  private async process(s: Session, e: Event) {
    const at = Date.parse(e.occurred_at);
    if (e.event_type === 'call.hangup') {
      s.row.endedAt = at;
      if (s.row.result === 'AWAITING_TESTER') s.row.result = 'NO_TESTER_INPUT';
      clearTimeout(s.timer); this.changed(); return;
    }
    if (s.row.endedAt !== undefined || s.row.terminationRequested) return;
    if (e.event_type === 'call.initiated') {
      // A second event ID for the same initiation must not produce another answer.
      if (s.answerRequested || s.prompted || s.row.answeredAt !== undefined) return;
      s.answerRequested = true;
      if (!(await this.send(s, 'answer'))) await this.stop(s);
    } else if (e.event_type === 'call.answered') {
      s.row.answeredAt ??= at;
      if (!s.prompted) {
        s.prompted = true;
        if (!(await this.send(s, 'gather_using_audio', {
          audio_url: requiredAnnouncementAudio(ROUTING_TEST_MESSAGE).url, minimum_digits: 1, maximum_digits: 1,
          maximum_tries: 1, valid_digits: '012', timeout_millis: 10000,
        }))) await this.stop(s);
      }
    } else if (e.event_type === 'call.gather.ended' && s.row.expected === undefined) {
      const digits = e.payload.digits;
      s.row.expected = digits === '1' ? 'A' : digits === '2' ? 'B' : digits === '0' ? 'direct' : undefined;
      const o = s.row.observation;
      s.row.result = !s.row.expected ? 'NO_TESTER_INPUT'
        : s.row.expected === 'direct' ? (o.kind === 'missing' ? 'DIRECT_OK' : 'UNEXPECTED_DIVERSION')
        : o.kind === 'candidate' ? (o.candidate === s.row.expected ? 'MATCH' : 'MISMATCH')
        : o.kind.toUpperCase();
      // Keep media flowing while the operator establishes the second call. A
      // single idempotent command repeats finite generic audio; no audio is captured.
      if (!(await this.send(s, 'playback_start', {
        audio_url: requiredAnnouncementAudio(ROUTING_TEST_HOLD).url, audio_type: 'wav', cache_audio: true, loop: 20,
      }))) await this.stop(s);
    }
    this.changed();
  }

  private async stop(s: Session) {
    if (s.row.endedAt !== undefined || s.row.terminationRequested) return;
    s.row.terminationRequested = true; clearTimeout(s.timer);
    if (s.row.result === 'AWAITING_TESTER') s.row.result = 'NO_TESTER_INPUT';
    // Retry the same idempotent command after an uncertain HTTP result.
    if (!(await this.send(s, 'hangup'))) await this.send(s, 'hangup');
    this.changed();
  }

  async drain() { await Promise.all([...this.sessions.values()].map(s => s.chain)); }
  async close() {
    this.closing = true;
    await this.drain();
    await Promise.all([...this.sessions.values()].map(s => this.stop(s)));
  }
}

export function createProbeServer(probe: SharedNumberProbe, publicKey: string) {
  if (Buffer.from(publicKey, 'base64').length !== 32) throw new Error('invalid_public_key');
  const app = Fastify({ logger: false, bodyLimit: 32768, requestTimeout: 10000 });
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
  app.get('/health', async () => ({ ready: true, diagnosticOnly: true }));
  app.post('/webhooks/telnyx', async (req, reply) => {
    const raw = req.body as Buffer;
    if (!Buffer.isBuffer(raw) || !verifyTelnyx(publicKey, req.headers['telnyx-signature-ed25519'], req.headers['telnyx-timestamp'], raw)) {
      return reply.code(403).send({ ok: false });
    }
    let input: unknown;
    try { input = JSON.parse(raw.toString('utf8')); } catch { return reply.code(400).send({ ok: false }); }
    return reply.code(probe.accept(input)).send({ ok: true });
  });
  app.setErrorHandler((_error, _req, reply) => reply.code(400).send({ ok: false }));
  app.addHook('onClose', async () => { await probe.close(); });
  return app;
}
