import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { HybridScreeningSession } from '../src/live/hybrid.js';
import { ScreeningSession } from '../src/live/session.js';
import { attachMediaTransport } from '../src/live/media-transport.js';
import { prepareBridge } from '../src/cloud/bridge-startup.js';
import type { CloudConfig } from '../src/cloud/config.js';

class Socket extends EventEmitter {
  readyState = 0; bufferedAmount = 0; sent: unknown[] = [];
  send(value: unknown) { this.sent.push(value); }
  open() { this.readyState = 1; this.emit('open'); }
  message(value: object) { this.emit('message', Buffer.from(JSON.stringify(value))); }
  terminate() { this.readyState = 3; this.emit('close'); }
}
function hybrid() {
  let now = 1000;
  const stt = new Socket(), provider = new Socket();
  const io = { telnyx: vi.fn(), finish: vi.fn().mockResolvedValue(undefined), close: vi.fn(), ready: vi.fn(), waitForGreeting: true };
  const fetcher = vi.fn();
  const session = new HybridScreeningSession(io, { openai: 'synthetic', soniox: 'synthetic' }, {}, {
    now: () => now, socket: () => stt as unknown as WebSocket, fetch: fetcher
  });
  const clear = attachMediaTransport(provider as unknown as WebSocket, session, () => session.start(), vi.fn());
  provider.message({ event: 'start', start: { media_format: { encoding: 'PCMU', sample_rate: 8000, channels: 1 } } });
  stt.open();
  const audio = () => provider.message({ event: 'media', media: { track: 'inbound', chunk: 1, payload: Buffer.alloc(160, 255).toString('base64') } });
  const processed = () => stt.message({ tokens: [], final_audio_proc_ms: 20, total_audio_proc_ms: 20 });
  return { session, stt, provider, io, audio, processed, fetcher, clear, advance: (ms: number) => { now += ms; session.tick(); } };
}

describe('Readiness before the invitation to speak', () => {
  it('processes 25 independent synthetic audio sessions and contains individual disconnects', async () => {
    const calls = Array.from({ length: 25 }, () => hybrid());
    try {
      for (const call of calls) { call.audio(); call.processed(); call.session.listen(); }
      calls[0]!.provider.emit('close');
      calls[1]!.provider.emit('error', new Error('synthetic_disconnect'));
      for (const call of calls.slice(2)) {
        expect(call.io.ready).toHaveBeenCalledTimes(1);
        expect(call.io.finish).not.toHaveBeenCalled();
        expect(call.session.ended).toBe(false);
        call.advance(8000);
        expect(call.io.finish).toHaveBeenCalledExactlyOnceWith('silent_caller');
        expect(call.fetcher).not.toHaveBeenCalled();
      }
      for (const call of calls.slice(0, 2)) expect(call.io.finish).toHaveBeenCalledTimes(1);
    } finally { for (const call of calls) { call.session.providerEnded(); call.clear(); } }
  });
  it('requires successful audio processing, then gives a full silence budget after the greeting', () => {
    const h = hybrid();
    expect(h.io.ready).not.toHaveBeenCalled();
    h.audio(); h.processed(); h.processed();
    expect(h.io.ready).toHaveBeenCalledTimes(1);
    h.advance(9000); expect(h.io.finish).not.toHaveBeenCalled();
    h.session.listen(); h.advance(7999); expect(h.io.finish).not.toHaveBeenCalled();
    h.advance(1); expect(h.io.finish).toHaveBeenCalledExactlyOnceWith('silent_caller'); h.clear();
  });
  it.each(['authentication', 'missing-response', 'invalid-progress'])('does not invite speech after %s failure', mode => {
    const h = hybrid(); h.audio();
    if (mode === 'authentication') h.stt.message({ error_code: 401, tokens: [] });
    if (mode === 'invalid-progress') h.stt.message({ tokens: [], final_audio_proc_ms: 9999 });
    if (mode === 'missing-response') h.advance(10_000);
    expect(h.io.ready).not.toHaveBeenCalled();
    expect(h.io.finish).toHaveBeenCalledExactlyOnceWith('screening_unavailable'); h.clear();
  });
  it('captures an early utterance but starts no assessment until the greeting completes', async () => {
    const h = hybrid(); h.audio();
    h.stt.message({ tokens: [{ text: 'Synthetic caller about lunch tomorrow.', is_final: true }, { text: '<end>', is_final: true }], final_audio_proc_ms: 20 });
    h.advance(9000); await Promise.resolve();
    expect(h.fetcher).not.toHaveBeenCalled(); expect(h.io.finish).not.toHaveBeenCalled();
    h.session.providerEnded(); h.clear();
  });
  it.each(['stop', 'close', 'error'])('isolates %s during startup even if handoff stalls and readiness arrives late', async mode => {
    const old = hybrid(); old.io.finish.mockImplementation(() => new Promise(() => {}));
    if (mode === 'stop') old.provider.message({ event: 'stop' });
    else old.provider.emit(mode, ...(mode === 'error' ? [new Error('synthetic')] : []));
    old.audio(); old.processed();
    expect(old.io.ready).not.toHaveBeenCalled(); expect(old.io.finish).toHaveBeenCalledTimes(1);
    const next = hybrid(); next.audio(); next.processed();
    expect(next.io.ready).toHaveBeenCalledTimes(1); expect(next.io.finish).not.toHaveBeenCalled();
    next.session.providerEnded(); old.clear(); next.clear();
  });
  it('requires Live session acknowledgement and buffers early speech until the greeting is complete', () => {
    let now = 1000;
    const io = { openai: vi.fn(), telnyx: vi.fn(), finish: vi.fn().mockResolvedValue(undefined), close: vi.fn(), ready: vi.fn(), waitForGreeting: true };
    const session = new ScreeningSession(io, () => now);
    session.start(); expect(io.ready).not.toHaveBeenCalled();
    session.input(1, Buffer.alloc(160, 255).toString('base64'));
    session.event({ type: 'session.started', session: { model: 'gpt-live-1' } });
    expect(io.ready).toHaveBeenCalledTimes(1);
    now += 11_000; session.tick(); expect(io.finish).not.toHaveBeenCalled();
    expect(io.openai.mock.calls.some(([e]) => e.type === 'session.input_audio.append')).toBe(false);
    session.listen(); expect(io.openai.mock.calls.filter(([e]) => e.type === 'session.input_audio.append')).toHaveLength(1);
    session.providerEnded();
  });
  it('contains a failed outcome save and closes its own transport without poisoning the next session', async () => {
    const old = hybrid(); old.io.finish.mockRejectedValue(new Error('synthetic_database_failure'));
    await expect(old.session.stop('screening_unavailable')).resolves.toBeUndefined();
    expect(old.io.close).toHaveBeenCalledTimes(1);
    const next = hybrid(); next.audio(); next.processed(); expect(next.io.ready).toHaveBeenCalledTimes(1);
    next.session.providerEnded(); old.clear(); next.clear();
    const io = { openai: vi.fn(), telnyx: vi.fn(), finish: vi.fn().mockRejectedValue(new Error('synthetic_database_failure')), close: vi.fn() };
    await expect(new ScreeningSession(io).stop('screening_unavailable')).resolves.toBeUndefined();
    expect(io.close).toHaveBeenCalledTimes(1);
  });
});

describe('On-demand preparation', () => {
  const config = { LIVE_BRIDGE_URL: 'https://synthetic.a.run.app', TRIAL_PROXY_SECRET: 'a'.repeat(64) } as CloudConfig;
  const id = '12345678-1234-1234-1234-123456789abc';
  it('accepts only the preparation contract, never a generic healthy container', async () => {
    await expect(prepareBridge(config, id, 8000, vi.fn().mockResolvedValue(Response.json({ status: 'ready' })))) .rejects.toThrow('screening_prepare_failed');
    await expect(prepareBridge(config, id, 8000, vi.fn().mockResolvedValue(Response.json({ startupProtocol: 1 })))).resolves.toBeUndefined();
    await expect(prepareBridge(config, id, 0, vi.fn())).rejects.toThrow('screening_startup_expired');
  });
  it('aborts a stuck preparation request within its remaining budget', async () => {
    const fetcher = vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => {
      options!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    await expect(prepareBridge(config, id, 40, fetcher)).rejects.toThrow('aborted');
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ method: 'POST', redirect: 'error' });
  });
});
