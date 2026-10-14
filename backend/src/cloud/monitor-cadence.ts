/** Reserve checks across the entire connected hour; unused windows are not spent in a later burst. */
export const MONITOR_CADENCE_VERSION = '2026-10-14-hour-v1';
export const MONITOR_HOUR_MS = 3_600_000;
export const MONITOR_WINDOWS = [
  { from: 0, until: 300_000, interval: 5_000, firstSlot: 0 },
  { from: 300_000, until: 1_200_000, interval: 15_000, firstSlot: 60 },
  { from: 1_200_000, until: MONITOR_HOUR_MS, interval: 20_000, firstSlot: 120 }
] as const;

export function monitorWindow(startedAt: number, now: number) {
  const elapsed = Math.max(0, now - startedAt);
  const phase = MONITOR_WINDOWS.find(p => elapsed < p.until);
  if (!phase) return undefined;
  const offset = Math.floor((elapsed - phase.from) / phase.interval);
  return { slot: phase.firstSlot + offset, interval: phase.interval,
    next: startedAt + phase.from + (offset + 1) * phase.interval };
}

/** A delayed worker skips missed windows; it never catches up by spending several checks at once. */
export function nextMonitorCheck(startedAt: number, now: number, lastSlot = -1, lastCheckAt?: number) {
  const current = monitorWindow(startedAt, now);
  if (!current) return undefined;
  let due = Math.max(now, lastCheckAt === undefined ? now : lastCheckAt + (monitorWindow(startedAt, lastCheckAt)?.interval ?? current.interval));
  // Protect against duplicate delivery and a clock that temporarily moves backwards.
  while (true) {
    const window = monitorWindow(startedAt, due);
    if (!window) return undefined;
    if (window.slot > lastSlot) return due;
    due = window.next;
  }
}
