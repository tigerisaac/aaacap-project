// Generated voice only: verify transcription, message classification and summaries through production APIs.
// Never pass customer recordings/transcripts. No calls are placed and no live project documents are written.
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { providerKey } from './lib/screening-target.mjs';
import { voicemailCases } from './fixtures/redteam/saved-notices-development.mjs';
import { transcribeVoicemail, decideVoicemail, voicemailVerdict, VOICEMAIL_POLICY_VERSION } from '../dist/cloud/voicemail-check.js';
import { safeMessageSummary, MESSAGE_SUMMARY_VERSION } from '../dist/cloud/message-summary.js';

const key = await providerKey('openai');
const folder = await mkdtemp(join(tmpdir(), 'shield-synthetic-message-'));
const selected = voicemailCases.filter(c => ['notice-supplied-callback', 'notice-outage', 'message-code-demand'].includes(c.name));
const results = [];
try {
  for (const scenario of selected) {
    const aiff = join(folder, `${scenario.name}.aiff`), mp3 = join(folder, `${scenario.name}.mp3`);
    execFileSync('say', ['-v', 'Samantha', '-o', aiff, scenario.transcript]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '8000', '-ac', '1', '-b:a', '32k', mp3]);
    let openAIRequests = 0;
    const fetcher = (url, init) => { openAIRequests++; return fetch(url, init); };
    const transcript = await transcribeVoicemail(await readFile(mp3), key, fetcher);
    const assessment = transcript?.trim() ? await decideVoicemail(transcript, key, fetcher) : undefined;
    const verdict = voicemailVerdict({ transcript, assessment, duration: 30 });
    const summary = verdict === 'keep' ? safeMessageSummary(assessment?.summary) : undefined;
    const passed = !!transcript?.trim() && !!assessment && openAIRequests === 2 && (scenario.expected === 'keep' ? verdict === 'keep' && !!summary : verdict !== 'keep' && !summary);
    const result = { case: scenario.name, expected: scenario.expected, transcribed: !!transcript?.trim(), assessed: !!assessment,
      verdict, summarized: !!summary, openAIRequests, passed };
    results.push(result); console.log(JSON.stringify(result));
  }
} finally { await rm(folder, { recursive: true, force: true }); }
await mkdir('artifacts/saved-message-eval', { recursive: true });
const sourceHash = createHash('sha256').update(await readFile('backend/src/cloud/voicemail-check.ts')).update(await readFile('backend/src/cloud/message-summary.ts')).digest('hex');
await writeFile('artifacts/saved-message-eval/results.json', JSON.stringify({ checkedAt: new Date().toISOString(),
  policyVersion: VOICEMAIL_POLICY_VERSION, summaryVersion: MESSAGE_SUMMARY_VERSION, sourceHash, syntheticOnly: true, results }, null, 2));
if (results.some(r => !r.passed)) process.exitCode = 1;
