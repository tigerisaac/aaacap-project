import { EventEmitter } from 'node:events';
import type { WebSocket } from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachMediaTransport } from '../src/live/media-transport.js';

function harness() {
  const socket = new EventEmitter(), start = vi.fn(), timing = vi.fn();
  const session = { ended: false, input: vi.fn(), stop: vi.fn(async () => { session.ended = true; }) };
  const clear = attachMediaTransport(socket as WebSocket, session, start, timing);
  const message = (event: object) => socket.emit('message', Buffer.from(JSON.stringify(event)));
  const begin = () => message({ event: 'start', start: { media_format: { encoding: 'PCMU', sample_rate: 8000, channels: 1 } } });
  return { socket, session, start, timing, clear, message, begin };
}
afterEach(() => vi.useRealTimers());
describe('Carrier media failure recovery', () => {
  it('bounds a connection that never starts media and records the specific timeout', async () => {
    vi.useFakeTimers(); const h = harness();
    h.message({ event: 'connected' }); await vi.advanceTimersByTimeAsync(5000);
    expect(h.session.stop).toHaveBeenCalledExactlyOnceWith('screening_unavailable');
    expect(h.timing).toHaveBeenCalledWith('provider_start_timeout', {});
    expect(h.start).not.toHaveBeenCalled();
  });
  it.each(['stop', 'close', 'error'])('routes unexpected %s to the safe fallback', async event => {
    vi.useFakeTimers(); const h = harness(); h.begin();
    if (event === 'stop') h.message({ event }); else h.socket.emit(event);
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.session.stop).toHaveBeenCalledExactlyOnceWith('screening_unavailable');
  });
  it('starts once, forwards inbound audio, and ignores closure after an outcome', async () => {
    vi.useFakeTimers(); const h = harness(); h.begin();
    const media = { track: 'inbound', chunk: '1', payload: '////' };
    h.message({ event: 'media', media }); h.message({ event: 'media', media: { ...media, track: 'outbound' } });
    expect(h.session.input).toHaveBeenCalledExactlyOnceWith(1, '////');
    await vi.advanceTimersByTimeAsync(5000); expect(h.session.stop).not.toHaveBeenCalled();
    h.session.ended = true; h.message({ event: 'stop' }); h.socket.emit('close');
    expect(h.session.stop).not.toHaveBeenCalled(); expect(h.start).toHaveBeenCalledTimes(1);
  });
  it('rejects duplicate or incompatible starts without starting another model', () => {
    vi.useFakeTimers(); const duplicate = harness(); duplicate.begin(); duplicate.begin();
    expect(duplicate.start).toHaveBeenCalledTimes(1);
    expect(duplicate.session.stop).toHaveBeenCalledExactlyOnceWith('screening_unavailable');
    const invalid = harness(); invalid.message({ event: 'start', start: { media_format: { encoding: 'L16' } } });
    expect(invalid.start).not.toHaveBeenCalled(); expect(invalid.session.stop).toHaveBeenCalledExactlyOnceWith('screening_unavailable');
  });
  it.each(['null', '[]', '{'])('contains malformed media input %s within its call', raw => {
    vi.useFakeTimers(); const h = harness();
    expect(() => h.socket.emit('message', Buffer.from(raw))).not.toThrow();
    expect(h.session.stop).toHaveBeenCalledExactlyOnceWith('screening_unavailable');
  });
  it('contains a failed fallback rather than rejecting into other sessions', async () => {
    vi.useFakeTimers(); const h = harness();
    h.session.stop.mockRejectedValueOnce(new Error('private provider failure'));
    h.socket.emit('close'); await Promise.resolve();
    expect(h.timing).toHaveBeenCalledWith('handoff_failed', {});
    expect(JSON.stringify(h.timing.mock.calls)).not.toContain('private');
  });
});
