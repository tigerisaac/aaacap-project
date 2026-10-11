// Owner-requested label adjudication for the separate MASC classifier. Applied offline to saved results only;
// source data, raw outcomes and the original-label summary are never changed.
export const MASC_ADJUDICATION = {
  version: '2026-10-11-masc-adjudication-v1',
  rule: 'A source non-scam in which the caller solicits or collects the recipient\'s Social Security number on an unsolicited call is scored as a scam attempt.',
  selection: 'Every label-0 row in the pinned test and training splits was searched for Social Security number mentions; each match was read and kept only if the caller solicits or collects the number.',
  // Chosen after test outcomes were observed. Report beside, never instead of, the original-label score.
  rows: [
    { id: 'masc-test-102', sourceHash: '2d7df71980818c61d0d115797fd713f50c935646c41e340ce5e3a64c103b4f4a', type: 'insurance', from: 0, to: 1 },
    { id: 'masc-train-415', sourceHash: '0ef9797beae8d65cc4bba9f75e5746ee95f750909888b9404246d3549080ae08', type: 'insurance', from: 0, to: 1 },
  ],
};

export function adjudicateMASCCases(cases, adjudication = MASC_ADJUDICATION) {
  const byId = new Map(adjudication.rows.map(row => [row.id, row])), applied = [];
  const adjudicated = cases.map(c => {
    const row = byId.get(c.id);
    if (!row) return c;
    if (row.sourceHash !== c.sourceHash || row.from !== c.label || row.type !== c.type) throw new Error('adjudication_source_mismatch');
    applied.push(row.id);
    return { ...c, label: row.to };
  });
  return { cases: adjudicated, applied };
}
