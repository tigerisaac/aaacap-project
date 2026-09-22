import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export class Vault {
  private readonly key: Buffer;
  private readonly lookupKey: Buffer;
  constructor(hexKey: string) {
    this.key = Buffer.from(hexKey, 'hex');
    if (this.key.length !== 32) throw new Error('Invalid data key.');
    this.lookupKey = Buffer.from(hkdfSync('sha256', this.key, Buffer.alloc(0), 'shield-lookup-v1', 32));
  }

  seal(value: string | Buffer, context: string): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(context));
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    return ['v1', nonce.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
  }

  openBytes(value: string, context: string): Buffer {
    const [version, nonce, tag, encrypted] = value.split('.');
    if (version !== 'v1' || !nonce || !tag || encrypted === undefined) throw new Error('Invalid encrypted value.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(nonce, 'base64'));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]);
  }

  open(value: string, context: string): string { return this.openBytes(value, context).toString('utf8'); }
  hash(value: string): string { return createHmac('sha256', this.lookupKey).update(value).digest('hex'); }
}

export function secureEqual(a: string, b: string): boolean {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '');
  const value = /^[2-9]\d{9}$/.test(cleaned) ? `+1${cleaned}` : cleaned;
  // v1 intentionally restricts destinations to NANP and excludes premium/service area codes.
  if (!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(value)) return null;
  if (['900', '976'].includes(value.slice(2, 5))) return null;
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed?.isValid() || !parsed.country || !['US', 'CA'].includes(parsed.country)) return null;
  return value;
}
