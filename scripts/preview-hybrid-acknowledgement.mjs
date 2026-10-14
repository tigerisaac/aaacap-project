// Offline playback preview of an existing synthetic run. No inference or phone calls.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, relative, join } from 'node:path';
import { HybridWaitAcknowledgement } from './lib/hybrid-wait-acknowledgement.mjs';

const input = resolve(process.argv[2] ?? '');
assert.equal(process.argv.length, 3, 'usage: node scripts/preview-hybrid-acknowledgement.mjs artifacts/hybrid-prototype-RUN');
const relativeInput = relative(resolve('artifacts'), input);
assert.ok(relativeInput.startsWith('hybrid-prototype-') && !relativeInput.includes('..'));
const out = join(input, 'ack-preview'), sha = data => createHash('sha256').update(data).digest('hex');
const summary = JSON.parse(await readFile(join(input, 'summary.json'), 'utf8'));
assert.ok(summary.interpretation.startsWith('Five local synthetic calls;'), 'synthetic_prototype_only');
const clip = await readFile('backend/src/live/ack-audio/one-moment.pcmu');
const metadata = JSON.parse(await readFile('backend/src/live/ack-audio/manifest.json', 'utf8'));
assert.equal(sha(clip), metadata.sha256); assert.equal(clip.length / 8, metadata.durationMs);
assert.equal(metadata.sampleRate, 8000); assert.equal(metadata.format, 'PCMU');
await mkdir(out, { recursive: false });
const ffmpeg = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
ffmpeg(['-f', 'mulaw', '-ar', '8000', '-ac', '1', '-i', 'backend/src/live/ack-audio/one-moment.pcmu', join(out, 'one-moment.wav')]);
const reports = [];
function samples(wav, channels) {
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 36, 40), 'data');
  assert.equal(wav.readUInt16LE(20), 1); assert.equal(wav.readUInt16LE(22), channels);
  assert.equal(wav.readUInt32LE(24), 8000); assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), wav.length - 44); return (wav.length - 44) / (channels * 2);
}
function decode(byte) {
  const u = ~byte & 255, magnitude = (((u & 15) << 3) + 132) << ((u >> 4) & 7);
  return u & 128 ? 132 - magnitude : magnitude - 132;
}
for (const result of summary.results) {
  assert.match(result.id, /^\d{2}-[a-z-]+$/);
  const report = JSON.parse(await readFile(join(input, `${result.id}.json`), 'utf8'));
  const mono = await readFile(join(input, result.recording)), stereo = await readFile(join(input, result.stereo));
  assert.equal(sha(mono), report.recordingSHA256);
  const frames = samples(mono, 1); assert.equal(samples(stereo, 2), frames);
  ffmpeg(['-i', join(input, result.stereo), '-filter_complex', '[0:a]channelsplit=channel_layout=stereo[c][s]',
    '-map', '[c]', '-f', 'mulaw', join(out, `${result.id}-caller.pcmu`),
    '-map', '[s]', '-f', 'mulaw', join(out, `${result.id}-shield.pcmu`)]);
  const caller = await readFile(join(out, `${result.id}-caller.pcmu`)), shield = await readFile(join(out, `${result.id}-shield.pcmu`));
  const mixed = Buffer.from(mono), separated = Buffer.from(stereo), events = [], changed = new Set();
  let now = 0;
  const ack = new HybridWaitAcknowledgement(clip, type => events.push({ type, ms: now }));
  const waitingAt = report.events.find(e => e.type === 'initial_decision_started')?.ms;
  const terminalAt = report.events.find(e => e.type === 'terminal').ms;
  // Replay the original 20 ms audio/event timeline. The greeting is not Live speech.
  for (let frame = 0; frame < frames; frame += 160) {
    now = frame / 8;
    if (waitingAt !== undefined && now >= waitingAt) ack.startWaiting(waitingAt);
    const live = now >= (report.openingEndMs ?? Infinity) ? shield.subarray(frame, frame + 160) : undefined;
    const playback = ack.frame(now, caller.subarray(frame, frame + 160), live, now >= terminalAt);
    if (playback?.source !== 'acknowledgement') continue;
    for (let i = 0; i < playback.audio.length && frame + i < frames; i++) {
      const index = frame + i, callerValue = stereo.readInt16LE(44 + index * 4), value = decode(playback.audio[i]);
      separated.writeInt16LE(value, 46 + index * 4);
      mixed.writeInt16LE(Math.max(-32768, Math.min(32767, callerValue + value)), 44 + index * 2);
      changed.add(index);
    }
  }
  assert.equal(mixed.length, mono.length); assert.equal(separated.length, stereo.length);
  for (let i = 0; i < frames; i++) {
    assert.equal(separated.readInt16LE(44 + i * 4), stereo.readInt16LE(44 + i * 4), 'caller_track_changed');
    if (!changed.has(i)) {
      assert.equal(mixed.readInt16LE(44 + i * 2), mono.readInt16LE(44 + i * 2), 'audio_changed_outside_acknowledgement');
      assert.equal(separated.readInt16LE(46 + i * 4), stereo.readInt16LE(46 + i * 4));
    }
  }
  await writeFile(join(out, result.recording), mixed, { flag: 'wx' });
  await writeFile(join(out, result.stereo), separated, { flag: 'wx' });
  reports.push({ id: result.id, title: result.title, actual: result.actual, passed: result.passed,
    recording: result.recording, stereo: result.stereo, originalMonoSHA256: sha(mono), originalStereoSHA256: sha(stereo),
    previewSHA256: sha(mixed), originalDurationMs: frames / 8, acknowledgementEvents: events,
    firstAcknowledgementAfterOpeningMs: events.find(e => e.type === 'acknowledgement_started')?.ms - report.openingEndMs,
    originalFirstLiveSpeechAfterOpeningMs: result.firstLiveSpeechAfterOpeningMs });
}
await writeFile(join(out, 'preview.json'), JSON.stringify({ kind: 'offline_audio_preview', paidInference: false,
  policyVersion: summary.policyVersion, originalOutcomesUnchanged: true, originalDurationsUnchanged: true,
  acknowledgement: metadata, results: reports }, null, 2), { flag: 'wx' });
const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
await writeFile(join(out, 'listen.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shield hybrid — with One moment</title><style>body{font:17px/1.5 system-ui;max-width:850px;margin:40px auto;padding:0 20px;color:#202523;background:#f5f6f4}article{background:white;border:1px solid #dce0da;border-radius:16px;padding:22px;margin:22px 0}audio{width:100%}h1{font-size:30px}h2{font-size:20px}a{color:#145e49}.meta{color:#526055;font-size:15px}</style>
<h1>Hybrid screening, with “One moment”</h1><p>The existing prerecorded Grace acknowledgement plays once during the initial wait. Caller speech, Live speech or the call ending cuts it off.</p>
<p><strong>Offline listening preview.</strong> The clip has been added to the five previous synthetic recordings using the updated playback controller. No model was rerun. Original speech, pauses, durations and outcomes are preserved; this does not fix the two unsuccessful conversations.</p>
<p><a href="../listen.html">Compare the original recordings</a></p><h2>The existing 1.1-second clip</h2><audio controls preload="metadata" src="one-moment.wav"></audio>
${reports.map(r => `<article><h2>${esc(r.title)}</h2><p>${esc(r.actual)} · ${r.passed ? 'original sequence completed' : 'original failure retained'}</p><audio controls preload="metadata" src="${esc(r.recording)}"></audio><p class="meta">Acknowledgement begins ${(r.firstAcknowledgementAfterOpeningMs / 1000).toFixed(2)} s after the opening. Original Live speech delay: ${r.originalFirstLiveSpeechAfterOpeningMs == null ? 'no handoff' : (r.originalFirstLiveSpeechAfterOpeningMs / 1000).toFixed(2) + ' s'}.</p><a href="${esc(r.recording)}" download>Download preview</a> · <a href="${esc(r.stereo)}" download>Stereo preview</a></article>`).join('')}
<p class="meta">Policy ${esc(summary.policyVersion)} unchanged. Local files only; no production changes or phone calls.</p></html>`, { flag: 'wx' });
console.log(JSON.stringify({ out, recordings: reports.length, starts: reports.map(r => r.acknowledgementEvents), originalAudioOutsideAcknowledgementUnchanged: true }));
