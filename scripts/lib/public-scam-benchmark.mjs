// MASC's published test split is synthetic. Do not adapt real calls or customer recordings here.
import { createHash } from 'node:crypto';
export const MASC = {
  dataset: 'BothBosu/multi-agent-scam-conversation',
  revision: '709db2b6c37f424c3070f29138abb33971e21ab9',
  file: 'agent_conversation_test.csv', license: 'Apache-2.0', expectedRows: 320,
};
export const digest = text => createHash('sha256').update(text).digest('hex');

// RFC 4180 fields, including quoted commas, escaped quotes and embedded newlines.
export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(field); field = '';
      if (c !== ',') { if (row.some(Boolean)) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else field += c;
  }
  if (quoted) throw new Error('unterminated_csv_quote');
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift()?.map(h => h.replace(/^\uFEFF/, ''));
  if (!headers || new Set(headers).size !== headers.length) throw new Error('invalid_csv_headers');
  return rows.map(values => {
    if (values.length !== headers.length) throw new Error('invalid_csv_row');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

export function mascCase(row, index) {
  if (!['0', '1'].includes(String(row.labels)) || typeof row.dialogue !== 'string') throw new Error('invalid_masc_row');
  const markers = [...row.dialogue.matchAll(/\b(Suspect|Innocent):\s*/g)];
  if (!markers.length || row.dialogue.slice(0, markers[0].index).trim()) throw new Error('invalid_dialogue_roles');
  const turns = markers.map((m, i) => ({ role: m[1] === 'Suspect' ? 'Caller' : 'Recipient',
    text: row.dialogue.slice(m.index + m[0].length, markers[i + 1]?.index).trim() })).filter(t => t.text);
  const caller = turns.filter(t => t.role === 'Caller').map(t => t.text);
  if (!caller.length || !turns.some(t => t.role === 'Recipient')) throw new Error('missing_dialogue_role');
  const label = Number(row.labels), type = row.type;
  if (!(label ? ['ssn', 'refund', 'support', 'reward'] : ['appointment', 'delivery', 'insurance', 'wrong']).includes(type)) throw new Error('unknown_masc_type');
  return { id: `masc-test-${index}`, sourceHash: digest(row.dialogue), label, type, personality: row.personality,
    // Labels, types and personality are never sent to either model.
    callerText: caller.join(' '), transcript: turns.map(t => `${t.role}: ${t.text}`).join('\n'),
    screeningGroup: label ? 'harmful' : ['appointment', 'delivery'].includes(type) ? 'legitimate' : 'policy_difference' };
}
