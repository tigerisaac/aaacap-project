import { describe, expect, it } from 'vitest';
import { cloudCallDTO } from '../src/cloud/api.js';
import { CloudStore, type Call } from '../src/cloud/store.js';
import type { CloudConfig } from '../src/cloud/config.js';

describe('call history status', () => {
  const createdAt = Date.UTC(2026, 9, 16, 17);
  function fixture(minutes: number, patch: Partial<Call> = {}) {
    const store = new CloudStore(null as never, { DATA_ENCRYPTION_KEY: 'b'.repeat(64) } as CloudConfig, () => createdAt + minutes * 60_000);
    const call: Call = { id: 'call', participantId: 'person', source: 'forwarding', createdAt, expiresAt: createdAt + 86400_000,
      callerEnc: store.vault.seal('+12025550100', 'call:call:caller'), state: 'accepted', outcome: 'connected', reason: 'routine',
      purpose: 'personal', acceptedAt: createdAt + 30_000, completedAt: null, events: [], ...patch };
    return cloudCallDTO(store, call);
  }

  it.each([8, 30, 59])('keeps a %i-minute accepted conversation connected', minutes => {
    expect(fixture(minutes)).toMatchObject({ outcome: 'connected', reasonCode: 'routine', endedAt: null,
      acceptedAt: new Date(createdAt + 30_000).toISOString() });
  });
  it('preserves the real end time of a completed conversation', () => {
    expect(fixture(65, { state: 'ended', completedAt: createdAt + 59 * 60_000 })).toMatchObject({
      outcome: 'connected', reasonCode: 'routine', endedAt: new Date(createdAt + 59 * 60_000).toISOString() });
  });
  it('still marks abandoned, unaccepted forwarding attempts as missed', () => {
    expect(fixture(8, { acceptedAt: undefined, state: 'offering', outcome: 'pending' })).toMatchObject({
      outcome: 'missed', reasonCode: 'screening_unavailable', endedAt: new Date(createdAt + 450_000).toISOString() });
  });
  it('keeps the shorter timeout for abandoned screening-only calls', () => {
    expect(fixture(3, { source: 'trial', acceptedAt: undefined, state: 'screening', outcome: 'pending' })).toMatchObject({
      outcome: 'missed', reasonCode: 'screening_unavailable', endedAt: new Date(createdAt + 120_000).toISOString() });
  });
});
