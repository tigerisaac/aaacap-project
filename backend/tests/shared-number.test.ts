import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProbeServer, observeDiversion, probeConfig, SharedNumberProbe } from '../src/diagnostics/shared-number.js';

const config = probeConfig.parse({ applicationId: '123456789', destination: '+12025550100', lineA: '+12025550101', lineB: '+12025550102', caseId: 'overlap' });
const header = (number = config.lineA) => [{ name: 'Diversion', value: `<sip:${number}@carrier.example>;reason=no-answer;counter=1` }];
const probes: SharedNumberProbe[] = [];
function setup() {
  const command = vi.fn(async () => {});
  const probe = new SharedNumberProbe(config, command);
  probes.push(probe);
  return { probe, command };
}
function event(type = 'call.initiated', call = 'call-a', overrides: Record<string, unknown> = {}, at = Date.now()) {
  return { data: { id: randomUUID(), event_type: type, occurred_at: new Date(at).toISOString(), payload: {
    call_control_id: call, call_leg_id: `leg-${call}`, connection_id: config.applicationId,
    direction: 'incoming', to: config.destination, from: '+12025550199', sip_headers: header(), ...overrides,
  } } };
}
afterEach(async () => {
  for (const p of probes.splice(0)) await p.close();
  vi.useRealTimers();
});

describe('conservative diversion observation', () => {
  it('matches tel/SIP variants and repeated identical identities without caller ID', () => {
    expect(observeDiversion(header(), config)).toMatchObject({ kind: 'candidate', candidate: 'A' });
    expect(observeDiversion([{ name: 'diversion', value: `<tel:${config.lineB}>;reason=user-busy` }], config)).toMatchObject({ candidate: 'B' });
    expect(observeDiversion([{ name: 'Diversion', value: '<sip:2025550101@carrier.example>, <tel:+12025550101>' }], config)).toEqual({ kind: 'candidate', candidate: 'A', entries: 2 });
  });
  it('separates missing, unknown, malformed and multi-person chains', () => {
    expect(observeDiversion(undefined, config).kind).toBe('missing');
    expect(observeDiversion(header('+12025550199'), config).kind).toBe('unregistered');
    expect(observeDiversion([...header(), ...header(config.lineB)], config).kind).toBe('ambiguous');
    for (const value of ['junk 2025550101', '<sip:+12025550101@a>\r\nFrom: x', '<sip:alice@a>', '<tel:+12025550101> trailing']) {
      expect(observeDiversion([{ name: 'Diversion', value }], config).kind).toBe('unsupported');
    }
  });
  it('refuses the production destination and duplicate test identities', () => {
    expect(probeConfig.safeParse({ ...config, destination: '+15074731802' }).success).toBe(false);
    expect(probeConfig.safeParse({ ...config, lineB: config.lineA }).success).toBe(false);
  });
  it('allows production only with an unexpired window of at most thirty minutes', () => {
    vi.useFakeTimers();
    const live = { ...config, destination: '+15074731802' };
    expect(probeConfig.safeParse({ ...live, productionTestUntil: Date.now() + 30 * 60_000 }).success).toBe(true);
    for (const productionTestUntil of [Date.now(), Date.now() - 1, Date.now() + 30 * 60_000 + 1]) {
      expect(probeConfig.safeParse({ ...live, productionTestUntil }).success).toBe(false);
    }
  });
  it('stops admitting new calls at the production deadline', async () => {
    vi.useFakeTimers();
    const live = probeConfig.parse({ ...config, destination: '+15074731802', productionTestUntil: Date.now() + 1000 });
    const command = vi.fn(async () => {});
    const probe = new SharedNumberProbe(live, command); probes.push(probe);
    vi.advanceTimersByTime(1000);
    expect(probe.accept(event('call.initiated', 'late', { to: live.destination }))).toBe(503);
    await probe.drain(); expect(command).not.toHaveBeenCalled();
  });
});

describe('isolated concurrent diagnostic', () => {
  it('compares independent tester input against metadata and proves completed A/B overlap', async () => {
    const { probe, command } = setup(); const start = Date.now();
    probe.accept(event('call.initiated', 'a', {}, start));
    probe.accept(event('call.initiated', 'b', { sip_headers: header(config.lineB) }, start));
    await probe.drain();
    probe.accept(event('call.answered', 'a', {}, start + 100));
    probe.accept(event('call.answered', 'b', {}, start + 200));
    probe.accept(event('call.gather.ended', 'b', { digits: '2' }, start + 300));
    probe.accept(event('call.gather.ended', 'a', { digits: '1' }, start + 400));
    await probe.drain();
    expect(probe.report().confirmedMatchedOverlapAB).toBe(false);
    probe.accept(event('call.hangup', 'a', {}, start + 2000));
    probe.accept(event('call.hangup', 'b', {}, start + 3000));
    await probe.drain();
    expect(probe.report().rows.map(r => r.result)).toEqual(['MATCH', 'MATCH']);
    expect(probe.report().confirmedMatchedOverlapAB).toBe(true);
    expect(command.mock.calls.map(c => c[1])).toEqual(['answer', 'answer', 'gather_using_speak', 'gather_using_speak']);
    const report = JSON.stringify(probe.report());
    for (const privateData of [config.lineA, config.lineB, config.destination, '2025550199', 'carrier.example', 'leg-a', 'call_control_id']) expect(report).not.toContain(privateData);
  });
  it('does not count sequential calls as concurrent', async () => {
    const { probe } = setup(); const start = Date.now();
    for (const [call, digit, offset] of [['a', '1', 0], ['b', '2', 1000]] as const) {
      probe.accept(event('call.initiated', call, { sip_headers: header(digit === '1' ? config.lineA : config.lineB) }, start));
      probe.accept(event('call.answered', call, {}, start + offset));
      probe.accept(event('call.gather.ended', call, { digits: digit }, start + offset + 10));
      probe.accept(event('call.hangup', call, {}, start + offset + 100));
    }
    await probe.drain(); expect(probe.report().confirmedMatchedOverlapAB).toBe(false);
  });
  it('exposes wrong-recipient matches rather than routing by tester input', async () => {
    const { probe } = setup();
    probe.accept(event()); probe.accept(event('call.gather.ended', 'call-a', { digits: '2' }));
    await probe.drain();
    expect(probe.report().rows[0]).toMatchObject({ expected: 'B', observation: { candidate: 'A' }, result: 'MISMATCH' });
  });
  it('never substitutes From for missing Diversion, even with withheld caller ID', async () => {
    const { probe } = setup();
    probe.accept(event('call.initiated', 'a', { sip_headers: undefined, from: config.lineA }));
    probe.accept(event('call.gather.ended', 'a', { digits: '1' }));
    probe.accept(event('call.initiated', 'b', { sip_headers: undefined, from: 'anonymous' }));
    probe.accept(event('call.gather.ended', 'b', { digits: '0' }));
    await probe.drain(); expect(probe.report().rows.map(r => r.result)).toEqual(['MISSING', 'DIRECT_OK']);
  });
  it('deduplicates event and initiation retries without resetting the call binding', async () => {
    const { probe, command } = setup(); const initial = event();
    probe.accept(initial); probe.accept(initial);
    probe.accept(event('call.initiated', 'call-a', { sip_headers: header(config.lineB) }));
    probe.accept(event('call.answered')); // no new session: default ID matches
    probe.accept(event('call.answered'));
    await probe.drain();
    expect(probe.report().calls).toBe(1);
    expect(probe.report().rows[0]?.observation.candidate).toBe('A');
    expect(command.mock.calls.filter(c => c[1] === 'answer')).toHaveLength(1);
    expect(command.mock.calls.filter(c => c[1] === 'gather_using_speak')).toHaveLength(1);
  });
  it('rejects wrong destinations, applications, directions and cross-leg callbacks', async () => {
    const { probe } = setup();
    for (const fields of [{ to: config.lineA }, { connection_id: '999' }, { direction: 'outgoing' }]) expect(probe.accept(event('call.initiated', 'a', fields))).toBe(403);
    probe.accept(event());
    expect(probe.accept(event('call.gather.ended', 'call-a', { call_leg_id: 'wrong', digits: '1' }))).toBe(403);
    await probe.drain(); expect(probe.report().rows[0]?.expected).toBeUndefined();
  });
  it('requests retries for reordered answer and never resurrects a hung-up call', async () => {
    const { probe, command } = setup();
    expect(probe.accept(event('call.answered'))).toBe(503);
    expect(probe.accept(event('call.hangup'))).toBe(200);
    expect(probe.accept(event())).toBe(200);
    await probe.drain(); expect(command).not.toHaveBeenCalled();
  });
  it('caps concurrent admissions and rejects an old initiation after restart', async () => {
    const { probe, command } = setup();
    expect(probe.accept(event('call.initiated', 'old', {}, Date.now() - 60000))).toBe(200);
    probe.accept(event('call.initiated', 'a')); probe.accept(event('call.initiated', 'b'));
    expect(probe.accept(event('call.initiated', 'c'))).toBe(503);
    await probe.drain(); expect(command).toHaveBeenCalledTimes(2);
  });
  it('bounds call lifetime, retries hangup failures and does not claim confirmed termination', async () => {
    vi.useFakeTimers(); const { probe, command } = setup();
    probe.accept(event()); await probe.drain();
    command.mockRejectedValueOnce(new Error('private provider response'));
    await vi.advanceTimersByTimeAsync(41000);
    expect(command.mock.calls.map(c => c[1])).toEqual(['answer', 'hangup', 'hangup']);
    expect(command.mock.calls[1]?.[2]).toEqual(command.mock.calls[2]?.[2]);
    expect(probe.report().rows[0]).toMatchObject({ terminationRequested: true, errors: ['hangup_failed'] });
    expect(probe.report().rows[0]?.endedAt).toBeUndefined();
    expect(JSON.stringify(probe.report())).not.toContain('private provider response');
  });
  it('terminates after a provider answer error and stops active calls on shutdown', async () => {
    const { probe, command } = setup(); command.mockRejectedValueOnce(new Error('failure'));
    probe.accept(event()); await probe.drain();
    expect(command.mock.calls.map(c => c[1])).toEqual(['answer', 'hangup']);
    probe.accept(event('call.initiated', 'b')); await probe.drain(); await probe.close();
    expect(command.mock.calls.at(-1)?.[1]).toBe('hangup');
  });
});

describe('raw-byte signed webhook boundary', () => {
  it('accepts valid signatures, rejects tampered/unsigned/stale requests and exposes no report route', async () => {
    const { probe } = setup();
    const keys = generateKeyPairSync('ed25519');
    const pub = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
    const server = createProbeServer(probe, pub);
    const raw = JSON.stringify(event()), timestamp = String(Math.floor(Date.now() / 1000));
    const sig = sign(null, Buffer.from(`${timestamp}|${raw}`), keys.privateKey).toString('base64');
    const headers = { 'content-type': 'application/json', 'telnyx-timestamp': timestamp, 'telnyx-signature-ed25519': sig };
    try {
      expect((await server.inject({ method: 'POST', url: '/webhooks/telnyx', headers, payload: raw })).statusCode).toBe(200);
      expect((await server.inject({ method: 'POST', url: '/webhooks/telnyx', headers, payload: raw + ' ' })).statusCode).toBe(403);
      expect((await server.inject({ method: 'POST', url: '/webhooks/telnyx', headers: { 'content-type': 'application/json' }, payload: raw })).statusCode).toBe(403);
      expect((await server.inject({ method: 'POST', url: '/webhooks/telnyx', headers: { ...headers, 'telnyx-timestamp': '1000000000' }, payload: raw })).statusCode).toBe(403);
      expect((await server.inject({ url: '/report' })).statusCode).toBe(404);
      expect((await server.inject({ url: '/health' })).json()).toEqual({ ready: true, diagnosticOnly: true });
    } finally { await server.close(); }
  });
});
