// Adapter for the voice-agent honeypot corpus (arXiv:2609.29528): REAL inbound scam/spam calls, de-identified by the authors.
// Prepared before the data was available. Field names follow the paper's Table 2; anything else fails loudly.
// Never mix these calls into development sets or prompt work, and never add Shield's own call data here.
import { digest } from './public-scam-benchmark.mjs';

export const HONEYPOT = {
  dataset: 'voice-agent-honeypot-corpus', paper: 'https://arxiv.org/abs/2609.29528',
  publicSubset: { rows: 1000, byLabel: { scam: 500, spam: 500 } },
  licence: 'Non-commercial (paper states CC BY-NC and CC BY-NC-SA 4.0); confirm on the release before use.',
  // Approximately 75 s of caller speech at about 150 words per minute, matching the production session limit.
  openingChars: 1200,
  // Published caller-disjoint scam-vs-rest results on the full corpus, quoted for context only.
  published: { basePositiveRate: 949 / 6374, zeroShotGemini25Flash: { f1: 0.79, precision: 0.73, recall: 0.85 },
    tfidfClassifiers: { f1: [0.70, 0.75] }, syntheticTrainedOnReal: { f1: [0.02, 0.40] } },
};
const LABELS = { scam: 1, spam: 0, legitimate: 0 };
const ROLES = { caller: 'Caller', agent: 'Recipient' };

// The release format is not yet known: accept a JSON array, { calls: [...] }, or one JSON record per line.
export function parseHoneypotRecords(text) {
  try {
    const value = JSON.parse(text);
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.calls)) return value.calls;
    return [value];
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return text.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
}

export function honeypotCase(record) {
  if (typeof record?.call_id !== 'string' || !/^[\w.:-]{1,128}$/.test(record.call_id)) throw new Error('invalid_call_id');
  if (!Object.hasOwn(LABELS, record.label_holistic)) throw new Error('unknown_holistic_label');
  if (!Array.isArray(record.turns) || !record.turns.length) throw new Error('missing_turns');
  const turns = record.turns.map(turn => {
    if (!Object.hasOwn(ROLES, turn?.speaker) || typeof turn.text !== 'string') throw new Error('unknown_turn_shape');
    return { role: ROLES[turn.speaker], text: turn.text.trim() };
  }).filter(turn => turn.text);
  const caller = turns.filter(t => t.role === 'Caller').map(t => t.text);
  if (!caller.length) throw new Error('missing_caller_speech');
  // The opening keeps whole caller turns in order and always includes the first one.
  const opening = [];
  for (const text of caller) {
    if (opening.length && opening.join(' ').length + text.length + 1 > HONEYPOT.openingChars) break;
    opening.push(text);
  }
  return { id: `honeypot-${record.call_id}`, sourceHash: digest(JSON.stringify(record.turns)), label: LABELS[record.label_holistic],
    type: record.label_holistic, strictScam: record.label_scam === true,
    // Labels, persona, signals, asks and caller pseudonyms never reach a model.
    callerOpening: opening.join(' '), callerText: caller.join(' '), transcript: turns.map(t => `${t.role}: ${t.text}`).join('\n') };
}

// Production screening and monitoring outcomes. Membership comes from source labels only, fixed before any outcome
// is read. Shield stops both scams and lead-generation spam (solicitation), so each group is reported separately;
// legitimate calls exist only in the full corpus.
export function summarizeHoneypot(results) {
  const screened = results.filter(r => r.screening), monitored = results.filter(r => r.monitor);
  return { screening: screened.length ? summarizeScreening(screened) : null, monitoring: monitored.length ? summarizeMonitoring(monitored) : null };
}

function summarizeScreening(results) {
  const ok = r => !r.screening.failure;
  const group = rows => ({
    total: rows.length,
    stopped: rows.filter(r => ok(r) && ['block', 'hold'].includes(r.screening.actual)).length,
    blocked: rows.filter(r => ok(r) && r.screening.actual === 'block').length,
    clarified: rows.filter(r => ok(r) && r.screening.actual === 'continue' && r.screening.questions > 0).length,
    approved: rows.filter(r => ok(r) && r.screening.actual === 'approve').length,
    failures: rows.filter(r => !ok(r)).length,
    byReason: rows.filter(r => ok(r) && r.screening.reason).reduce((counts, r) => ({ ...counts, [r.screening.reason]: (counts[r.screening.reason] ?? 0) + 1 }), {}),
  });
  const scams = results.filter(r => r.type === 'scam'), legitimate = results.filter(r => r.type === 'legitimate');
  const scamGroup = group(scams);
  return {
    scams: { ...scamGroup, identified: scamGroup.stopped + scamGroup.clarified },
    strictScams: group(scams.filter(r => r.strictScam)),
    spam: group(results.filter(r => r.type === 'spam')),
    legitimate: legitimate.length ? { ...group(legitimate), offered: legitimate.filter(r => ok(r) && r.screening.actual === 'approve').length } : null,
    // Diagnostic bridge to the paper's scam-vs-rest task: BLOCK with reason scam is the positive; holds are not.
    scamReasonAsDetector: scamReasonDetector(results),
  };
}

function scamReasonDetector(results) {
  const valid = results.filter(r => !r.screening.failure), positive = r => r.screening.actual === 'block' && r.screening.reason === 'scam';
  const scams = valid.filter(r => r.type === 'scam'), spam = valid.filter(r => r.type === 'spam');
  if (!scams.length || !spam.length) return null;
  const recall = scams.filter(positive).length / scams.length, falsePositiveRate = spam.filter(positive).length / spam.length;
  return { scamsFlagged: scams.filter(positive).length, scamsDecided: scams.length, spamFlagged: spam.filter(positive).length, spamDecided: spam.length,
    atPublishedPrevalence: prevalenceAdjusted(recall, falsePositiveRate) };
}

// Connected-call protection sees the production rolling tail once, at the end of the conversation. It has no
// solicitation rule, so spam outcomes are diagnostic only.
function summarizeMonitoring(results) {
  const group = rows => ({ total: rows.length,
    intervened: rows.filter(r => !r.monitor.failure && r.monitor.actual === 'intervene').length,
    continued: rows.filter(r => !r.monitor.failure && r.monitor.actual === 'continue').length,
    failures: rows.filter(r => r.monitor.failure).length,
    byConcern: rows.filter(r => !r.monitor.failure && r.monitor.actual === 'intervene').reduce((counts, r) => ({ ...counts, [r.monitor.concern]: (counts[r.monitor.concern] ?? 0) + 1 }), {}) });
  const legitimate = results.filter(r => r.type === 'legitimate');
  return { scams: group(results.filter(r => r.type === 'scam')), strictScams: group(results.filter(r => r.type === 'scam' && r.strictScam)),
    spamDiagnostic: group(results.filter(r => r.type === 'spam')), legitimate: legitimate.length ? group(legitimate) : null };
}

// The public subset is balanced; the paper's benchmark has about 15% scams. Recall and the spam false-positive
// rate do not depend on prevalence, so precision/F1 are re-estimated at the published base rate. Spam is a harder
// negative than the paper's legitimate and brief calls, so this estimate is conservative. Context only, not a ranking.
export function prevalenceAdjusted(recall, falsePositiveRate, prevalence = HONEYPOT.published.basePositiveRate) {
  if (![recall, falsePositiveRate].every(v => typeof v === 'number' && v >= 0 && v <= 1)) return null;
  const truePositives = prevalence * recall, falsePositives = (1 - prevalence) * falsePositiveRate;
  const precision = truePositives + falsePositives ? truePositives / (truePositives + falsePositives) : null;
  return { prevalence, recall, falsePositiveRate, precision,
    f1: precision === null || precision + recall === 0 ? null : 2 * precision * recall / (precision + recall) };
}
