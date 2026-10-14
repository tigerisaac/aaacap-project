// Local synthetic audio only. No telephony API, Firestore writes or production server.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, relative, join } from 'node:path';
import { WebSocket } from 'ws';
import { hybridPrototypeCases as cases } from './fixtures/hybrid-prototype-cases.mjs';
import { HybridScreeningGate, handoffInput } from './lib/hybrid-screening-gate.mjs';
import { liveSessionConfig, SCREENING_POLICY_VERSION, permittedDecision, LIVE_LIMITS } from '../dist/live/policy.js';
import { ScreeningSession, audiblePCMU } from '../dist/live/session.js';
import { responseUsage } from '../dist/live/timing.js';
import { providerKey, screeningCheck } from './lib/screening-target.mjs';
import { researchScamPattern } from '../dist/live/research.js';

const args = process.argv.slice(2), take = key => { const i = args.indexOf(key); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const output = take('--out'), prepare = args.includes('--prepare'), run = args.includes('--run');
assert.ok(output && prepare !== run && args.every(a => ['--prepare', '--run', '--allow-paid-audio'].includes(a)));
assert.ok(!run || args.includes('--allow-paid-audio'), 'paid_audio_requires_explicit_flag');
const out = resolve(output), rel = relative(resolve('artifacts'), out);
assert.ok(rel.startsWith('hybrid-prototype-') && !rel.includes('..'), 'isolated_output_required');
const config = liveSessionConfig(), request = config.delegation.responses;
assert.equal(SCREENING_POLICY_VERSION, '2026-10-13-general-v158');
assert.equal(request.model, 'gpt-6-luna'); assert.equal(request.reasoning.effort, 'medium');
const hash = b => createHash('sha256').update(b).digest('hex');
const sources = ['scripts/prototype-hybrid-screening.mjs', 'scripts/lib/hybrid-screening-gate.mjs',
  'scripts/fixtures/hybrid-prototype-cases.mjs', 'scripts/lib/screening-target.mjs',
  'backend/src/live/policy.ts', 'dist/live/policy.js', 'dist/live/session.js', 'dist/live/timing.js',
  'dist/live/evidence.js', 'dist/live/decision-progress.js', 'dist/live/research.js'];
const hashes = async () => Object.fromEntries(await Promise.all(sources.map(async p => [p, hash(await readFile(p))])));
const sourceHashes = await hashes();
const plan = { policyVersion: SCREENING_POLICY_VERSION, requestHash: hash(JSON.stringify(request)), sourceHashes,
  sonioxModel: 'stt-rt-v5', liveModel: config.model, decisionModel: request.model, reasoning: request.reasoning,
  cases: cases.map(c => ({ id: c.id, category: c.category, expected: c.expected, fixtureHash: hash(JSON.stringify(c)) })),
  interpretation: 'Five local synthetic calls; live provider audio paced at telephone rate. Four ordinary and one harmful caller. Not a random sample, paired comparison, production deployment or real phone call. Pauses are preserved in the recordings. No replacement credit for retries.' };

function convert(source, target, codec = 'mulaw') {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-ar', '8000', '-ac', '1',
    '-f', codec === 'mulaw' ? 'mulaw' : 's16le', target], { stdio: ['ignore', 'ignore', 'pipe'] });
}
if (prepare) {
  await mkdir(out, { recursive: false });
  for (const c of cases) {
    for (const [part, text] of [['opening', c.opening], ['answer', c.answer]]) {
      const prefix = join(out, `${c.id}-${part}`);
      execFileSync('/usr/bin/say', ['-v', c.voice, '-r', '165', '-o', `${prefix}.aiff`, text], { stdio: ['ignore', 'ignore', 'pipe'] });
      convert(`${prefix}.aiff`, `${prefix}.pcmu`);
      const audio = await readFile(`${prefix}.pcmu`);
      assert.ok(audio.length >= 8000 && audiblePCMU(audio), 'caller_audio_empty_or_silent');
    }
  }
  convert('backend/src/cloud/announcement-audio/01-greeting.wav', join(out, 'greeting.pcmu'));
  convert('backend/src/cloud/announcement-audio/02-hold.wav', join(out, 'offer.pcmu'));
  const audioNames = ['greeting.pcmu', 'offer.pcmu', ...cases.flatMap(c => [`${c.id}-opening.pcmu`, `${c.id}-answer.pcmu`])];
  plan.audioHashes = Object.fromEntries(await Promise.all(audioNames.map(async f => [f, hash(await readFile(join(out, f)))])));
  await writeFile(join(out, 'plan.json'), JSON.stringify(plan, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ prepared: true, out, calls: cases.length, policy: SCREENING_POLICY_VERSION, paidInference: false }));
  process.exit(0);
}
const frozen = JSON.parse(await readFile(join(out, 'plan.json'), 'utf8'));
const { audioHashes, ...frozenPlan } = frozen; assert.deepEqual(frozenPlan, plan, 'prepared_source_changed');
for (const [f, digest] of Object.entries(audioHashes)) {
  const audio = await readFile(join(out, f));
  assert.equal(hash(audio), digest, 'prepared_audio_changed');
  assert.ok(audio.length >= 8000 && audiblePCMU(audio), 'prepared_audio_empty_or_silent');
}
await writeFile(join(out, 'started.json'), JSON.stringify({ startedAt: new Date().toISOString(), policy: SCREENING_POLICY_VERSION }), { flag: 'wx' });
process.loadEnvFile('.env.speech');
const sonioxKey = process.env.SONIOX_API_KEY; assert.ok(sonioxKey, 'soniox_key_missing');
const openaiKey = await providerKey('openai');
const greeting = await readFile(join(out, 'greeting.pcmu')), offer = await readFile(join(out, 'offer.pcmu'));
const results = [];

// PCM recordings represent playback, including network/decision gaps, rather than concatenated utterances.
function decodeMuLaw(byte) {
  const u = ~byte & 255, sample = (((u & 15) << 3) + 132) << ((u >> 4) & 7);
  return (u & 128) ? 132 - sample : sample - 132;
}
function wavFromEvents(events, durationMs, channels = 1) {
  const frames = Math.ceil(durationMs * 8), samples = new Int32Array(frames * channels);
  for (const e of events) {
    const start = Math.round(e.ms * 8), channel = e.side === 'caller' ? 0 : 1;
    for (let i = 0; i < e.audio.length && start + i < frames; i++) {
      samples[(start + i) * channels + (channels === 1 ? 0 : channel)] += decodeMuLaw(e.audio[i]);
    }
  }
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, samples[i])), i * 2);
  const h = Buffer.alloc(44); h.write('RIFF'); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(8000, 24);
  h.writeUInt32LE(16000 * channels, 28); h.writeUInt16LE(2 * channels, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40); return Buffer.concat([h, data]);
}

async function simulate(c) {
  const opening = await readFile(join(out, `${c.id}-opening.pcmu`)), answer = await readFile(join(out, `${c.id}-answer.pcmu`));
  const startedAt = Date.now(), clock = () => Date.now() - startedAt, events = [], audio = [], usage = [], dialogue = [];
  const stamp = (type, fields = {}) => events.push({ type, ms: clock(), ...fields });
  let phase = 'triage', finished = false, final, error, timer, ticker, session, liveSocket, liveStartedAt, liveClosedAt;
  let sonioxOpenedAt, sonioxClosedAt, finalText = '', provisional = '', inputFrame = 1, allToolCalls = 0;
  let openingEndMs, answerStartMs, answerEndMs, liveReadyMs, firstLiveSpeechMs, handoffMs, initialDecision;
  let assistantText = '', assistantMark = 0, questionText = '', lastAssistantSound = -Infinity, assistantAfterOpening = false;
  let answered = false, answerPosition = 0, postHandoffText = '', gate;
  let firstResponseQuestionMatched = false, resolveDone;
  const done = new Promise(resolveDone_ => { resolveDone = resolveDone_; });
  const writeAudio = (side, bytes) => audio.push({ ms: clock(), side, audio: Buffer.from(bytes) });
  const stt = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket', {
    headers: { Authorization: `Bearer ${sonioxKey}` }, handshakeTimeout: 5000, followRedirects: false, maxPayload: 1_000_000
  });
  const closeSTT = () => { if (stt.readyState === 1) { stt.send(''); stt.close(); } else stt.terminate(); sonioxClosedAt ??= clock(); };
  const end = (value, failure) => {
    if (finished) return;
    finished = true; final = typeof value === 'string' ? value : value.action; if (failure) error = failure;
    stamp('terminal', { action: final, ...(failure ? { failure } : {}) }); gate?.close();
    clearTimeout(timer); clearInterval(ticker); closeSTT();
    if (session && !session.ended) session.stop('screening_unavailable');
    if (liveSocket?.readyState === 1) liveSocket.send(JSON.stringify({ type: 'session.close' }));
    // Drain final usage briefly; recorded duration stops at the actual decision.
    setTimeout(() => { liveSocket?.terminate(); liveClosedAt ??= clock(); resolveDone(); }, 1200);
  };
  const assess = async transcript => {
    stamp('initial_decision_started', { transcriptCharacters: transcript.length });
    const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', redirect: 'error',
      signal: AbortSignal.timeout(LIVE_LIMITS.backendMs), headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, store: false, input: [screeningCheck(transcript)] }) });
    if (!r.ok) { stamp('provider_error', { provider: 'luna', httpStatus: r.status }); throw new Error('initial_provider_failure'); }
    const response = await r.json(); usage.push({ stage: 'initial', ...responseUsage(response) });
    if (response.status !== 'completed') throw new Error('initial_incomplete');
    const tools = response.output.filter(x => x.type === 'function_call'); allToolCalls += tools.length;
    // A lookup or malformed result is retained as an unsupported prototype outcome, never fabricated.
    if (tools.length !== 1 || tools[0].name !== 'screen_call') throw new Error('initial_tool_unsupported');
    const d = permittedDecision(JSON.parse(tools[0].arguments), transcript);
    if (!d) throw new Error('initial_decision_invalid');
    stamp('initial_decision_completed', { action: d.action }); return d;
  };
  const activate = (decision, transcript) => {
    initialDecision = decision;
    if (decision.action !== 'continue') { end(decision); return; }
    phase = 'handoff'; handoffMs = clock(); stamp('live_requested');
    dialogue.push({ speaker: 'caller', text: transcript, source: 'soniox' });
    session = new ScreeningSession({
      openai: event => {
        if (event.type === 'session.start') {
          assert.deepEqual(event.session, config, 'production_config_changed');
          event = { ...event, session: { ...event.session, input: handoffInput(transcript, decision) } };
        }
        if (liveSocket?.readyState === 1) liveSocket.send(JSON.stringify(event));
      },
      telnyx: event => {
        if (event.event !== 'media' || finished) return;
        const bytes = Buffer.from(event.media.payload, 'base64'); writeAudio('shield', bytes);
        if (audiblePCMU(bytes)) {
          lastAssistantSound = clock();
          if (openingEndMs !== undefined) { assistantAfterOpening = true; firstLiveSpeechMs ??= clock(); }
        }
      },
      research: topic => researchScamPattern(topic, openaiKey),
      finish: async d => {
        // The actual prototype has no offer/dial operation. Premature approval is a failure.
        if (typeof d !== 'string' && d.action === 'approve' && !postHandoffText.trim()) end('screening_unavailable', 'approval_without_caller_answer');
        else end(d);
      },
      close: () => { if (!finished) end('screening_unavailable', 'unexpected_session_close'); },
      timing: (type, fields) => { stamp(`live_${type}`, fields); if (type === 'response_usage') usage.push({ stage: 'live', ...fields }); }
    });
    // Local validation must know exactly the caller history seeded into the remote voice session.
    session.event({ type: 'session.input_transcript.delta', delta: `${transcript} ` });
    liveSocket = new WebSocket('wss://api.openai.com/v1/live/sessions', {
      headers: { Authorization: `Bearer ${openaiKey}` }, handshakeTimeout: 5000, followRedirects: false, maxPayload: 1_000_000
    });
    liveSocket.on('open', () => { liveStartedAt = clock(); stamp('live_socket_open'); session.start(); });
    liveSocket.on('message', raw => {
      try {
        const e = JSON.parse(raw.toString());
        if (e.type === 'session.started') { liveReadyMs = clock(); phase = 'live'; stamp('live_ready'); closeSTT(); }
        if (e.type === 'session.closed') { liveClosedAt ??= clock(); liveSocket.close(); }
        if (e.type === 'session.input_transcript.delta') postHandoffText += e.delta ?? '';
        if (e.type === 'session.output_transcript.delta') assistantText += e.delta ?? '';
        if (e.type === 'response.event' && e.event?.type === 'response.output_item.done' && e.event.item?.type === 'function_call') {
          if (++allToolCalls > LIVE_LIMITS.maxToolCalls) { end('screening_timeout', 'total_tool_limit'); return; }
        }
        if (e.type === 'error') {
          stamp('provider_error', { provider: 'live', code: /^[a-z_]+$/.test(e.error?.code ?? '') ? e.error.code : 'unknown' });
          if (!finished) error = 'live_provider_error';
        }
        session.event(e);
      } catch { end('screening_unavailable', 'invalid_live_event'); }
    });
    liveSocket.on('error', () => end('screening_unavailable', 'live_transport_failure'));
    liveSocket.on('close', () => { liveClosedAt ??= clock(); if (!finished) end('screening_unavailable', 'live_closed'); });
  };
  gate = new HybridScreeningGate({ assess, apply: activate, fail: reason => end(reason, 'initial_assessment_failed') });
  stt.on('open', () => {
    sonioxOpenedAt = clock(); stamp('soniox_open');
    stt.send(JSON.stringify({ model: 'stt-rt-v5', audio_format: 'mulaw', sample_rate: 8000, num_channels: 1,
      language_hints: ['en'], enable_endpoint_detection: true, max_endpoint_delay_ms: 1500 }));
    let greetingPosition = 0, position = -2800;
    ticker = setInterval(() => {
      if (finished) return;
      let caller = Buffer.alloc(160, 255);
      if (greetingPosition < greeting.length) {
        const bytes = Buffer.alloc(160, 255); greeting.copy(bytes, 0, greetingPosition, Math.min(greetingPosition + 160, greeting.length));
        writeAudio('shield', bytes); greetingPosition += 160;
      } else if (openingEndMs === undefined) {
        if (position >= 0) opening.copy(caller, 0, position, Math.min(position + 160, opening.length));
        position += 160;
        if (position >= opening.length) { openingEndMs = clock(); stamp('opening_finished'); }
      } else if (answered && answerPosition < answer.length) {
        answer.copy(caller, 0, answerPosition, Math.min(answerPosition + 160, answer.length)); answerPosition += 160;
        if (answerPosition >= answer.length) { answerEndMs = clock(); stamp('answer_finished'); }
      } else if (!answered && assistantAfterOpening && clock() - lastAssistantSound >= 900) {
        const spoken = assistantText.slice(assistantMark).trim();
        const isQuestion = /\?|\b(?:who|what|which|could you|can you|please tell|may I)\b/i.test(spoken);
        if (isQuestion) {
          questionText = spoken; firstResponseQuestionMatched = new RegExp(c.questionPattern, 'i').test(spoken);
          stamp('question_finished', { relevant: firstResponseQuestionMatched });
          if (firstResponseQuestionMatched) { answered = true; answerStartMs = clock(); stamp('answer_started'); }
          else { end('screening_unavailable', 'question_did_not_match_scripted_answer'); return; }
          assistantMark = assistantText.length;
        }
      }
      writeAudio('caller', caller);
      if (audiblePCMU(caller)) gate.speech();
      if (stt.readyState === 1) stt.send(caller);
      if (session) session.input(inputFrame++, caller.toString('base64'));
      gate.tick(); session?.tick();
    }, 20);
  });
  stt.on('message', raw => {
    try {
      const e = JSON.parse(raw.toString());
      if (e.error_code) { stamp('provider_error', { provider: 'soniox', httpStatus: e.error_code }); end('screening_unavailable', 'soniox_provider_error'); return; }
      const tokens = e.tokens ?? [], finalTokens = tokens.filter(t => t.is_final && !/^<.*>$/.test(t.text));
      finalText += finalTokens.map(t => t.text).join('');
      provisional = tokens.filter(t => !t.is_final && !/^<.*>$/.test(t.text)).map(t => t.text).join('');
      const endpoint = tokens.some(t => t.is_final && t.text === '<end>');
      if (endpoint) stamp('soniox_endpoint');
      if (phase === 'triage') gate.update(finalText, provisional, endpoint);
    } catch { end('screening_unavailable', 'invalid_soniox_event'); }
  });
  stt.on('error', () => end('screening_unavailable', 'soniox_transport_failure'));
  stt.on('close', () => { sonioxClosedAt ??= clock(); if (!finished && phase === 'triage') end('screening_unavailable', 'soniox_closed'); });
  timer = setTimeout(() => end('screening_timeout', 'overall_deadline'), LIVE_LIMITS.maximumMs);
  await done;
  const terminalMs = events.find(e => e.type === 'terminal').ms;
  if (final === 'approve') audio.push({ ms: terminalMs + 150, side: 'shield', audio: offer });
  const durationMs = terminalMs + (final === 'approve' ? offer.length / 8 + 400 : 400);
  const recording = `${c.id}.wav`, stereo = `${c.id}-stereo.wav`;
  await writeFile(join(out, recording), wavFromEvents(audio, durationMs), { flag: 'wx' });
  await writeFile(join(out, stereo), wavFromEvents(audio, durationMs, 2), { flag: 'wx' });
  const passed = final === c.expected && initialDecision?.action === 'continue' && answered && firstResponseQuestionMatched && !error;
  const result = { id: c.id, title: c.title, category: c.category, expected: c.expected, actual: final, passed,
    failure: error, recording, stereo, durationMs, initialChecks: gate.checks, allToolCalls, initialAction: initialDecision?.action,
    answered, firstResponseQuestionMatched, openingEndMs, handoffMs, liveReadyMs, firstLiveSpeechMs, answerStartMs, answerEndMs,
    firstLiveSpeechAfterOpeningMs: firstLiveSpeechMs === undefined ? null : firstLiveSpeechMs - openingEndMs,
    liveStartupMs: liveReadyMs === undefined ? null : liveReadyMs - handoffMs,
    liveDurationMs: liveStartedAt === undefined ? 0 : liveClosedAt - liveStartedAt,
    sonioxDurationMs: sonioxOpenedAt === undefined ? 0 : sonioxClosedAt - sonioxOpenedAt,
    question: questionText, assistantTranscript: assistantText,
    callerTranscript: [dialogue[0]?.text ?? finalText, postHandoffText].filter(Boolean).join(' '), usage, events,
    recordingSHA256: hash(await readFile(join(out, recording))) };
  await writeFile(join(out, `${c.id}.json`), JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ case: c.id, initial: result.initialAction, actual: final, passed,
    firstLiveSpeechDelayMs: result.firstLiveSpeechAfterOpeningMs, startupMs: result.liveStartupMs, failure: error }));
  return result;
}

for (const c of cases) results.push(await simulate(c));
assert.deepEqual(await hashes(), sourceHashes, 'source_changed_during_run');
const summary = { policyVersion: SCREENING_POLICY_VERSION, requestHash: plan.requestHash, sourceUnchanged: true,
  interpretation: plan.interpretation, completed: results.length, passed: results.filter(r => r.passed).length,
  ordinaryOffered: { count: results.filter(r => r.category === 'ordinary' && r.actual === 'approve').length, total: 4 },
  harmfulStopped: { count: results.filter(r => r.category === 'harmful' && r.actual === 'block').length, total: 1 },
  results: results.map(({ events, usage, callerTranscript, assistantTranscript, ...r }) => r) };
await writeFile(join(out, 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sec = ms => ms == null ? '—' : `${(ms / 1000).toFixed(2)} s`;
await writeFile(join(out, 'listen.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shield hybrid — five synthetic calls</title><style>body{font:17px/1.5 system-ui;max-width:850px;margin:40px auto;padding:0 20px;color:#202523;background:#f5f6f4}article{background:white;border:1px solid #dce0da;border-radius:16px;padding:22px;margin:22px 0}audio{width:100%}.meta{color:#526055;font-size:15px}h1{font-size:30px}h2{font-size:20px}a{color:#145e49}summary{cursor:pointer}pre{white-space:pre-wrap;font:inherit}</style>
<h1>Shield hybrid: five synthetic calls</h1><p>Soniox listens first. Unchanged v158 Luna decides whether clarification is needed. GPT Live then joins with the conversation history.</p>
<p class="meta">Local prototype • No phone calls or production changes • Real pauses retained • Caller voices are synthesized locally; questions are actual GPT Live audio. The final “offers your call” recording simulates the existing handoff; nobody was dialed.</p>
<p>${summary.passed}/5 complete intended sequences. Ordinary offers: ${summary.ordinaryOffered.count}/4. Harmful stops: ${summary.harmfulStopped.count}/1. These five selected cases do not establish general accuracy or cost savings.</p>
${results.map(r => `<article><h2>${esc(r.title)}</h2><p>${esc(r.actual)} · ${r.passed ? 'intended sequence completed' : 'review needed'}${r.failure ? ` · ${esc(r.failure)}` : ''}</p>
<audio controls preload="metadata" src="${esc(r.recording)}"></audio><p class="meta">Opening end → first Live speech: ${sec(r.firstLiveSpeechAfterOpeningMs)} · Live startup: ${sec(r.liveStartupMs)} · Initial Luna checks: ${r.initialChecks}</p>
<p><a href="${esc(r.recording)}" download>Download recording</a> · <a href="${esc(r.stereo)}" download>Stereo: caller left / Shield right</a></p>
<details><summary>Recognized dialogue and question</summary><p><b>Question:</b> ${esc(r.question)}</p><p><b>Caller:</b> ${esc(r.callerTranscript)}</p><p><b>Shield:</b> ${esc(r.assistantTranscript)}</p></details></article>`).join('')}
<p class="meta">Policy ${esc(SCREENING_POLICY_VERSION)}. Recordings are 8 kHz telephone-band audio. See summary.json and individual reports for original outcomes, timings and token usage.</p></html>`, { flag: 'wx' });
console.log(JSON.stringify({ completed: results.length, passed: summary.passed, out, productionChanged: false }));
if (summary.passed !== cases.length) process.exitCode = 1;
