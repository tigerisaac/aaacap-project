import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTrialApp, loadTrialConfig } from '../src/trial.js';
import { digest, generateSpeech, loadSpeech, loadSpeechConfig, recipeHash, trialPrompts,
  type PromptID, type SpeechManifest } from '../src/speech.js';
import { routine } from './helpers.js';

const directories: string[] = [];
const apps: Awaited<ReturnType<typeof buildTrialApp>>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function audioFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'shield-speech-'));
  directories.push(directory);
  const config = loadSpeechConfig({ TTS_PROVIDER: 'soniox', SPEECH_AUDIO_DIR: directory });
  const manifest: SpeechManifest = { version: 1, entries: {} };
  for (const id of Object.keys(trialPrompts) as PromptID[]) {
    const bytes = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(128), Buffer.from(id)]);
    const sha256 = digest(bytes);
    const file = `${sha256}.mp3`;
    await writeFile(join(directory, file), bytes);
    manifest.entries[id] = { recipe: recipeHash(config, id), sha256, file };
  }
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest));
  return { config, directory, manifest };
}

describe('Soniox prompt preparation', () => {
  it('sends fixed copy to the documented endpoint with bounded requests and accepts only MP3 audio', async () => {
    const config = loadSpeechConfig({ SONIOX_API_KEY: 'synthetic-private-key' });
    const bytes = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(128)]);
    const request = vi.fn<typeof fetch>(async () => new Response(bytes, { headers: { 'content-type': 'audio/mpeg' } }));
    expect(await generateSpeech(config, 'greeting', request)).toEqual(bytes);
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe('https://tts-rt.soniox.com/tts');
    expect(options?.headers).toMatchObject({ authorization: 'Bearer synthetic-private-key' });
    expect(options?.redirect).toBe('error');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options!.body as string)).toEqual({ model: 'tts-rt-v2', voice: 'Adrian',
      language: 'en', audio_format: 'mp3', sample_rate: 24000, bitrate: 64000,
      text: "Hello, what's your reason for calling?" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([
    { status: 402, mime: 'application/json', body: 'private provider detail' },
    { status: 200, mime: 'application/json', body: '{"error":"private detail"}' },
    { status: 200, mime: 'audio/mpeg', body: 'not an audio file' },
    { status: 200, mime: 'audio/mpeg', body: 'ID3' + 'x'.repeat(1_000_000) }
  ])('rejects failed or invalid audio without retrying or exposing provider detail ($status / $mime)', async ({ status, mime, body }) => {
    const config = loadSpeechConfig({ SONIOX_API_KEY: 'synthetic-private-key' });
    const request = vi.fn<typeof fetch>(async () => new Response(body, { status, headers: { 'content-type': mime } }));
    await expect(generateSpeech(config, 'greeting', request)).rejects.toThrow(/^soniox_/);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('cached prompt playback', () => {
  it('fails startup for missing, stale, corrupt or unsafe cache entries', async () => {
    const f = await audioFixture();
    await expect(loadSpeech({ ...f.config, SONIOX_VOICE: 'changed-voice' }, 'https://example.com')).rejects.toThrow('speech_cache_stale');
    await writeFile(join(f.directory, f.manifest.entries.greeting!.file), 'bad data');
    await expect(loadSpeech(f.config, 'https://example.com')).rejects.toThrow('speech_cache_invalid');
    f.manifest.entries.greeting!.file = '../../.env.speech';
    await writeFile(join(f.directory, 'manifest.json'), JSON.stringify(f.manifest));
    await expect(loadSpeech(f.config, 'https://example.com')).rejects.toThrow();
    delete f.manifest.entries.greeting;
    await writeFile(join(f.directory, 'manifest.json'), JSON.stringify(f.manifest));
    await expect(loadSpeech(f.config, 'https://example.com')).rejects.toThrow('speech_cache_stale');
  });
  it('plays cached audio in Gather and result TwiML, exposes only public prompts, and needs no runtime Soniox key', async () => {
    const f = await audioFixture();
    const config = loadTrialConfig({ NODE_ENV: 'test', TRIAL_PUBLIC_BASE_URL: 'https://trial.example.com',
      TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'test-only-token-'.repeat(3),
      TRIAL_TWILIO_NUMBER: '+15125550110', TRIAL_VERIFIED_CALLER: '+15125550100',
      TRIAL_PROXY_SECRET: 'b'.repeat(64), TRIAL_SCREENING_ENABLED: 'true', SCREENING_PROVIDER: 'openrouter',
      OPENROUTER_API_KEY: 'synthetic-model-key', OPENROUTER_MODEL: 'test-model',
      TTS_PROVIDER: 'soniox', SPEECH_AUDIO_DIR: f.directory });
    const payload = { AccountSid: config.TWILIO_ACCOUNT_SID, CallSid: `CA${'c'.repeat(32)}`,
      From: config.TRIAL_VERIFIED_CALLER, To: config.TRIAL_TWILIO_NUMBER, Direction: 'inbound' };
    const extract = vi.fn(async () => routine);
    const app = await buildTrialApp(config, { logger: false, screener: { version: 'synthetic', extract },
      lookupCall: async () => ({ sid: payload.CallSid, accountSid: payload.AccountSid, from: payload.From,
        to: payload.To, direction: 'inbound', status: 'in-progress', dateCreated: new Date() }) });
    apps.push(app);
    const post = (step: string, values: Record<string, string> = {}) => app.inject({ method: 'POST',
      url: `/trial/${config.TRIAL_PROXY_SECRET}/${step}`,
      payload: new URLSearchParams({ ...payload, ...values }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    const inbound = await post('inbound');
    expect(inbound.body).toContain(`<Play>https://trial.example.com/speech/${f.manifest.entries.greeting!.file}</Play></Gather>`);
    expect(inbound.body).not.toContain('<Say');
    expect(inbound.headers['cache-control']).toBe('no-store');
    const introduction = await post('introduction', { SpeechResult: 'Appointment tomorrow.' });
    expect(introduction.body).toContain(`/speech/${f.manifest.entries.waiting!.file}`);
    const result = await post('result');
    expect(result.body).toContain(`/speech/${f.manifest.entries.offer!.file}`);
    expect(result.body).not.toContain('Appointment tomorrow.');
    expect(extract).toHaveBeenCalledTimes(1);
    const path = `/speech/${f.manifest.entries.greeting!.file}`;
    const audio = await app.inject(path);
    expect(audio.statusCode).toBe(200);
    expect(audio.headers['content-type']).toBe('audio/mpeg');
    expect(audio.headers['cache-control']).toContain('immutable');
    expect(digest(audio.rawPayload)).toBe(f.manifest.entries.greeting!.sha256);
    expect((await app.inject({ method: 'HEAD', url: path })).statusCode).toBe(200);
    expect((await app.inject('/speech/manifest.json')).statusCode).toBe(404);
    expect((await app.inject('/speech/%2e%2e%2f.env.speech')).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/speech/generate', payload: { text: 'private text' } })).statusCode).toBe(404);
    expect((await app.inject('/healthz')).body).not.toMatch(/synthetic-model-key|SONIOX/);
  });
});
