import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { loadModelConfig, modelConfigured } from '../src/model-config.js';
import { createScreener, screen } from '../src/screening.js';

const config = loadModelConfig();
if (!modelConfigured(config)) throw new Error('Configure the selected screening provider, API key and explicit model. This command makes billable API requests.');
const cases = z.array(z.object({ id: z.string(), text: z.string(), expected: z.enum(['offer', 'verify', 'refuse', 'message']) })).parse(
  JSON.parse(await readFile(new URL('../evals/synthetic-cases.json', import.meta.url), 'utf8')));
const screener = createScreener(config);
const results = [];
for (const item of cases) {
  const started = performance.now();
  const decision = await screen(screener, item.text, config.MODEL_TIMEOUT_MS);
  results.push({ id: item.id, expected: item.expected, actual: decision.route, reason: decision.reason,
    elapsedMs: Math.round(performance.now() - started), matched: decision.route === item.expected,
    inappropriateOffer: decision.route === 'offer' && item.expected !== 'offer' });
}
const report = { timestamp: new Date().toISOString(), model: screener.version, policy: 'shield-policy-1',
  syntheticOnly: true, matched: results.filter(r => r.matched).length, total: results.length,
  inappropriateOffers: results.filter(r => r.inappropriateOffer).length,
  unavailable: results.filter(r => r.reason === 'screening_unavailable').length, results,
  limitation: 'Small synthetic smoke suite. Not a fraud-accuracy, speech-recognition, carrier, or production-readiness evaluation.' };
const directory = resolve('artifacts/evaluations'); await mkdir(directory, { recursive: true });
const file = resolve(directory, `model-${Date.now()}.json`); await writeFile(file, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ report: file, matched: report.matched, total: report.total, inappropriateOffers: report.inappropriateOffers, unavailable: report.unavailable }, null, 2));
if (report.matched !== report.total || report.unavailable || report.inappropriateOffers) process.exitCode = 1;
