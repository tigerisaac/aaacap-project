import { describe, expect, it } from 'vitest';
import { decide, screen, type Extraction } from '../src/screening.js';
import { Vault, normalizePhone } from '../src/crypto.js';
import { loadConfig } from '../src/config.js';
import { routine } from './helpers.js';

describe('policy and security boundaries', () => {
  it('offers a supported routine extraction, without claiming identity', () => {
    expect(decide(routine, 'Appointment tomorrow.')).toEqual({ route: 'offer', reason: 'routine', purpose: 'appointment' });
  });
  it.each(['absent-field', 'unknown', 'bad-schema', 'unsupported-purpose'])('preserves uncertainty for %s', variant => {
    const data: any = structuredClone(routine);
    if (variant === 'absent-field') delete data.sensitiveAccountIssue;
    if (variant === 'unknown') data.sensitiveAccountIssue.value = 'unknown';
    if (variant === 'bad-schema') data.prohibitedRequests = 'false';
    if (variant === 'unsupported-purpose') data.purpose = 'other';
    expect(decide(data, 'Hello.').route).toBe('message');
  });
  it('requires evidence that exists in the submitted text', () => {
    const data: Extraction = { ...routine, prohibitedRequests: [{ type: 'secret_code', evidence: 'give me the code' }] };
    expect(decide(data, 'An appointment reminder.').reason).toBe('uncertain');
    expect(decide(data, 'Please give me the code.').route).toBe('refuse');
  });
  it('does not treat a model schema as a reliable fraud verdict', () => {
    // This is a policy-unit test, not an end-to-end model accuracy benchmark.
    const data: Extraction = { ...routine, uncertainty: ['contradictory'] };
    expect(decide(data, 'A contradictory introduction').route).toBe('message');
  });
  it('bounds a stalled extractor and falls back', async () => {
    const decision = await screen({ version: 'hung-fixture', extract: () => new Promise(() => {}) }, 'A caller introduction', 10);
    expect(decision.reason).toBe('screening_unavailable');
  });
  it('encrypts values and binds ciphertext to its tenant and field', () => {
    const vault = new Vault('cd'.repeat(32)); const sealed = vault.seal('private message', 'tenant-a');
    expect(sealed).not.toContain('private message'); expect(vault.open(sealed, 'tenant-a')).toBe('private message');
    expect(() => vault.open(sealed, 'tenant-b')).toThrow();
    expect(vault.hash('+15125550100')).toBe(vault.hash('+15125550100'));
  });
  it('rejects nonphone input and premium destinations', () => {
    expect(normalizePhone('+19005550100')).toBeNull(); expect(normalizePhone('https://attacker.test')).toBeNull();
    expect(normalizePhone('(512) 555-0100')).toBe('+15125550100');
  });
  it('cannot run demo mode on a public host or in production', () => {
    const env = { DATA_ENCRYPTION_KEY: 'ab'.repeat(32), DEMO_ACCESS_TOKEN: 'token'.repeat(10) };
    expect(() => loadConfig({ ...env, HOST: '0.0.0.0' })).toThrow();
    expect(() => loadConfig({ ...env, NODE_ENV: 'production' })).toThrow();
    expect(() => loadConfig({ ...env, SHIELD_MODE: 'live' })).toThrow();
  });
});
