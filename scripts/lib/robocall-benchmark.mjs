// FTC Project Point of No Entry robocalls packaged by NC State (wspr-ncsu/robocall-audio-dataset): REAL recorded
// robocalls in the public domain. Only the robocaller channel was transcribed (Whisper medium). There are no
// legitimate calls, so this measures harmful calls stopped only. Never use these calls for prompt or development work.
import { digest } from './public-scam-benchmark.mjs';

export const ROBOCALL = {
  dataset: 'wspr-ncsu/robocall-audio-dataset', revision: '5aa6f3bfa8563ce8c1c75ebf8a2271e6ff6b4272', file: 'metadata.csv',
  licence: 'Data in the public domain; README documentation CC BY-ND.', expectedRows: 1432,
  // Approximately 75 s of speech at about 150 words per minute, matching the production session limit.
  openingChars: 1200,
};

// Campaigns replay the same recording; Whisper output differs only in case, punctuation and spacing.
export const normalizedTranscript = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// IDs follow row order at the pinned revision: 26 recordings are listed under two FTC letters, so file names repeat.
export function robocallCase(row, index) {
  if (!Number.isInteger(index) || index < 0) throw new Error('invalid_row_index');
  if (typeof row?.file_name !== 'string' || !/^audio-wav-16khz\/[^/]+\.wav$/.test(row.file_name) || row.file_name.includes('..')) throw new Error('invalid_file_name');
  if (![row.language, row.transcript, row.case_details].every(value => typeof value === 'string')) throw new Error('invalid_robocall_row');
  const callerText = row.transcript.replace(/\s+/g, ' ').trim();
  // Whole words only; a single word longer than the budget is kept rather than emptied.
  let callerOpening = callerText;
  if (callerOpening.length > ROBOCALL.openingChars) {
    const cut = callerOpening.slice(0, ROBOCALL.openingChars + 1), space = cut.lastIndexOf(' ');
    callerOpening = space > 0 ? cut.slice(0, space) : cut.slice(0, ROBOCALL.openingChars);
  }
  return { id: `robocall-${index}`, sourceHash: digest(normalizedTranscript(callerText)),
    language: row.language, campaign: row.case_details, callerOpening, callerText };
}

// English, non-empty, one case per distinct recording. Fixed from source fields before any outcome is read.
export function selectRobocalls(cases) {
  const unique = new Map(), excluded = { nonEnglish: 0, empty: 0, duplicate: 0 };
  for (const c of cases) {
    if (c.language !== 'en') excluded.nonEnglish++;
    else if (!normalizedTranscript(c.callerText)) excluded.empty++;
    else if (unique.has(c.sourceHash)) { excluded.duplicate++; unique.get(c.sourceHash).copies++; }
    else unique.set(c.sourceHash, { ...c, copies: 1 });
  }
  return { cases: [...unique.values()], excluded };
}

// A completed stop is BLOCK or HOLD. Clarifications follow the MASC identification rule but stay separate: in a live
// call a recording cannot answer, and the production no-pause robocall timer is not modeled in text.
export function summarizeRobocalls(results) {
  const ok = results.filter(r => !r.screening.failure), is = action => ok.filter(r => r.screening.actual === action);
  const stopped = ok.filter(r => ['block', 'hold'].includes(r.screening.actual));
  const clarified = is('continue').filter(r => r.screening.questions > 0);
  const weighted = rows => rows.reduce((sum, r) => sum + (r.copies ?? 1), 0);
  const byCampaign = {};
  for (const r of results) {
    const entry = byCampaign[r.campaign] ??= { total: 0, stopped: 0, approved: 0 };
    entry.total++;
    if (stopped.includes(r)) entry.stopped++;
    if (!r.screening.failure && r.screening.actual === 'approve') entry.approved++;
  }
  return {
    total: results.length, stopped: stopped.length, blocked: is('block').length, held: is('hold').length,
    clarified: clarified.length, identified: stopped.length + clarified.length, approved: is('approve').length,
    // A response with no applicable decision or question: neither a stop nor an approval.
    otherOutcomes: ok.length - stopped.length - clarified.length - is('approve').length,
    failures: results.length - ok.length,
    byReason: stopped.reduce((counts, r) => ({ ...counts, [r.screening.reason]: (counts[r.screening.reason] ?? 0) + 1 }), {}),
    // Each distinct recording's outcome applied to every original call that replayed it.
    callWeighted: { calls: weighted(results), stopped: weighted(stopped), approved: weighted(is('approve')) },
    byCampaign,
  };
}
