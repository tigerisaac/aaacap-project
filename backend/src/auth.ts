import type { FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import type { Store } from './store.js';
import type { Row } from './db.js';
import { secureEqual } from './crypto.js';

export class HttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string) { super(code); }
}
export type Identity = { subject: string };
export type Access = { participant: Row; identity: Identity; isOwner: boolean; canListen: boolean };
export interface AuthProvider {
  identify(token: string): Promise<Identity>;
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, token: string): Promise<Record<string, unknown>>;
  refresh(token: string): Promise<Record<string, unknown>>;
  logout(token: string): Promise<void>;
}

export class ManagedAuth implements AuthProvider {
  constructor(private readonly config: Config) {}
  private async request(path: string, body?: unknown, bearer?: string): Promise<Record<string, any>> {
    if (!this.config.SUPABASE_URL || !this.config.SUPABASE_PUBLISHABLE_KEY) throw new HttpError(503, 'sign_in_unavailable');
    const response = await fetch(`${this.config.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { apikey: this.config.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 401, response.status === 429 ? 'try_again_later' : 'sign_in_failed');
    if (response.status === 204) return {};
    return response.json() as Promise<Record<string, any>>;
  }
  async identify(token: string): Promise<Identity> {
    if (this.config.SHIELD_MODE === 'demo') {
      if (secureEqual(token, this.config.DEMO_ACCESS_TOKEN)) return { subject: 'demo-participant' };
      if (secureEqual(token, `${this.config.DEMO_ACCESS_TOKEN}.caregiver`)) return { subject: 'demo-caregiver' };
      throw new HttpError(401, 'sign_in_required');
    }
    // Ask the configured auth project to verify the token; never trust a decoded JWT alone.
    const user = await this.request('user', undefined, token);
    if (typeof user.id !== 'string' || !user.email_confirmed_at) throw new HttpError(401, 'sign_in_required');
    return { subject: user.id };
  }
  async requestCode(email: string): Promise<void> { await this.request('otp', { email, create_user: true }); }
  async verifyCode(email: string, token: string): Promise<Record<string, unknown>> {
    return this.session(await this.request('verify', { email, token, type: 'email' }));
  }
  async refresh(token: string): Promise<Record<string, unknown>> {
    return this.session(await this.request('token?grant_type=refresh_token', { refresh_token: token }));
  }
  async logout(token: string): Promise<void> { if (this.config.SHIELD_MODE !== 'demo') await this.request('logout', {}, token); }
  private session(data: Record<string, any>): Record<string, unknown> {
    if (!data.access_token || !data.refresh_token) throw new HttpError(401, 'sign_in_failed');
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in ?? 3600 };
  }
}

export function bearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ') || header.length > 8192) throw new HttpError(401, 'sign_in_required');
  return header.slice(7);
}

export async function accessFor(store: Store, identity: Identity, selected?: string): Promise<Access> {
  const own = await store.bySubject(identity.subject);
  if (!selected || selected === own?.id) {
    if (!own) throw new HttpError(409, 'enrollment_required');
    return { participant: own, identity, isOwner: true, canListen: true };
  }
  if (!/^[0-9a-f-]{36}$/i.test(selected)) throw new HttpError(400, 'invalid_person');
  const grant = (await store.db.query(`SELECT g.can_listen,p.* FROM caregiver_grants g JOIN participants p ON p.id=g.participant_id
    WHERE p.id=$1 AND g.grantee_subject=$2 AND g.accepted_at IS NOT NULL AND g.revoked_at IS NULL AND p.status <> 'offboarded'`, [selected, identity.subject])).rows[0];
  if (!grant) throw new HttpError(403, 'access_denied');
  return { participant: grant, identity, isOwner: false, canListen: grant.can_listen };
}

export function requireOwner(access: Access): void { if (!access.isOwner) throw new HttpError(403, 'owner_required'); }
