"""Count archived FTC test outcomes without printing caller content."""
import collections
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sets = {}
for summary in (ROOT / 'artifacts').glob('**/summary.json'):
    if 'private' in summary.parts:
        continue
    try:
        data = json.loads(summary.read_text())
    except (ValueError, OSError):
        continue
    if not isinstance(data, dict) or not all(k in data for k in ('callWeighted', 'blocked', 'total', 'sourceResultsHash')):
        continue
    if 'wspr-ncsu/robocall-audio-dataset/' not in data.get('sourceURL', ''):
        continue
    if not data.get('fullUniqueSet') or data.get('completed') != data.get('planned') or data['total'] != data['planned']:
        continue
    results = summary.with_name('results.jsonl')
    if not results.exists():
        continue
    blob = results.read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    relative = str(summary.relative_to(ROOT))
    if digest not in sets or len(relative) < len(sets[digest][0]):
        sets[digest] = (relative, data, blob)
records = set()
counts = collections.Counter()
runs = []
for digest, (path, data, blob) in sorted(sets.items()):
    lines = [line for line in blob.splitlines() if line]
    rows = [json.loads(line) for line in lines]
    outcomes = collections.Counter(row.get('screening', {}).get('actual') for row in rows)
    assert len(rows) == data['total'], path
    assert outcomes['block'] == data['blocked'], path
    runs.append({'summary': path, 'results_sha256': digest, 'trials': len(rows), 'blocked': outcomes['block']})
    for line, row in zip(lines, rows):
        row_digest = hashlib.sha256(line).hexdigest()
        if row_digest in records:
            continue
        records.add(row_digest)
        counts[row.get('screening', {}).get('actual')] += 1
report = {
    'scope': 'Completed, full-set FTC transcript evaluations retained in local artifacts, across historical policy versions. Not unique calls or people protected.',
    'deduplication': 'Exact result-file copies counted once; identical serialized result records counted once across selected files. Incomplete sets excluded. Conservative archival count, not an exhaustive total of all project testing.',
    'complete_result_sets': len(runs),
    'distinct_retained_test_records': len(records),
    'outcomes': dict(counts),
    'sources': runs,
}
output = ROOT / 'presentation/shield-pitch/testing-count-audit.json'
output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'sources'}, indent=2))
