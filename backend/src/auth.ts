import type { FastifyRequest } from 'fastify';

export class HttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string) { super(code); }
}
export type Identity = { subject: string };
export interface AuthProvider {
  identify(token: string): Promise<Identity>;
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, token: string): Promise<Record<string, unknown>>;
  refresh(token: string): Promise<Record<string, unknown>>;
  logout(token: string): Promise<void>;
}

export function bearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ') || header.length > 8192) throw new HttpError(401, 'sign_in_required');
  return header.slice(7);
}
