// USD public list prices checked 2026-10-13. Duration charges are estimates,
// not provider billing records. Soniox publishes a typical hourly equivalent.
export const pricing = {
  checked: '2026-10-13', openai: 'https://developers.openai.com/api/docs/pricing',
  soniox: 'https://soniox.com/pricing', livePerMinute: 0.05, sonioxTypicalPerHour: 0.12,
  lunaPerMillion: { input: 0.10, cached: 0.01, write: 0.125, output: 0.50 }, fastMultiplier: 2,
  searchPerCall: 0.01
};
export function estimateHybridCost(record) {
  const warnings = new Set();
  let luna = 0, search = 0;
  for (const u of record.usage ?? []) {
    if (!Number.isFinite(u.inputTokens) || !Number.isFinite(u.outputTokens)) {
      warnings.add('Missing token usage: total is incomplete.'); continue;
    }
    if (u.priorityTier === undefined) warnings.add('Unreported service tier estimated at requested Fast rate (research at Standard).');
    const fast = u.priorityTier ?? u.stage !== 'research';
    const cached = u.cachedInputTokens ?? 0, write = u.cacheWriteTokens ?? 0;
    if (cached + write > u.inputTokens) throw new Error('invalid_usage_partition');
    const rates = pricing.lunaPerMillion;
    luna += ((u.inputTokens - cached - write) * rates.input + cached * rates.cached + write * rates.write
      + u.outputTokens * rates.output) / 1e6 * (fast ? pricing.fastMultiplier : 1);
    search += (u.searchCalls ?? 0) * pricing.searchPerCall;
  }
  if (!record.usage?.length) warnings.add('No Luna usage reported: total is incomplete.');
  const live = record.liveDurationMs / 60000 * pricing.livePerMinute;
  const soniox = record.sonioxDurationMs / 3600000 * pricing.sonioxTypicalPerHour;
  if (![live, soniox].every(n => Number.isFinite(n) && n >= 0)) throw new Error('invalid_duration');
  return { total: luna + search + live + soniox, luna, live, soniox, search, newTTS: 0,
    basis: 'Reported Luna tokens; Live socket duration (conservative proxy); Soniox socket duration at typical rate. Excludes telephony and hosting.',
    warnings: [...warnings], pricing };
}
