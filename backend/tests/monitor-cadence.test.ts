import { describe, expect, it } from 'vitest';
import { monitorWindow, nextMonitorCheck } from '../src/cloud/monitor-cadence.js';

describe('hour-long monitoring budget', () => {
  it('cannot consume a later window early, even with millisecond transcript updates', () => {
    const start = 12345678, checks: number[] = []; let lastSlot = -1, lastAt: number | undefined;
    for (let elapsed = 0; elapsed < 3600000; elapsed++) {
      const now = start + elapsed;
      if (nextMonitorCheck(start, now, lastSlot, lastAt) !== now) continue;
      lastSlot = monitorWindow(start, now)!.slot; lastAt = now; checks.push(elapsed);
    }
    expect(checks).toHaveLength(240);
    expect(checks[59]).toBe(295000); expect(checks[60]).toBe(300000);
    expect(checks[119]).toBe(1185000); expect(checks[120]).toBe(1200000);
    expect(checks.at(-1)).toBe(3580000);
    expect(nextMonitorCheck(start, start + 3600000)).toBeUndefined();
  });
  it('does not spend missed windows in a burst after silence or a delayed worker', () => {
    expect(nextMonitorCheck(0, 3500000, 0, 0)).toBe(3500000);
    expect(monitorWindow(0, 3500000)?.slot).toBe(235);
    expect(nextMonitorCheck(0, 3500001, 235, 3500000)).toBe(3520000);
  });
  it('does not bunch checks at phase boundaries or when the clock goes backwards', () => {
    expect(nextMonitorCheck(0, 300000, 59, 299999)).toBe(304999);
    expect(nextMonitorCheck(0, 1200000, 119, 1199999)).toBe(1214999);
    expect(nextMonitorCheck(0, 10000, 10, 50000)).toBe(55000);
  });
});
