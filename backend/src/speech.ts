import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type VoiceResponse from 'twilio/lib/twiml/VoiceResponse.js';
import { z } from 'zod';

// Only fixed product copy goes to TTS. Never synthesize caller text or model output.
export const trialPrompts = {
  greeting: "Hello, what's your reason for calling?",
  waiting: 'One moment.',
  expired: 'This Shield test session has ended.',
  connected: 'Your introduction reached Shield. The connection test succeeded. Goodbye.',
  silence: "I didn't hear a reason for calling. Please try again. Goodbye.",
  timeout: "Screening didn't finish. This call has not been cleared. Goodbye.",
  unavailable: 'Screening is unavailable. This call has not been cleared. Goodbye.',
  offer: "This introduction looks routine. Transfers aren't enabled in this demo. Goodbye.",
  verify: 'This call needs independent verification. It will not be connected. Goodbye.',
  refuse: 'This call was held for review. It will not be connected. Goodbye.',
  message: "There isn't enough information to screen this call. It will not be connected. Goodbye."
} as const;
export type PromptID = keyof typeof trialPrompts;
export const speechConfigFields = {
  TTS_PROVIDER: z.enum(['twilio', 'soniox']).default('twilio'),
  SONIOX_API_KEY: z.string().default(''),
  SONIOX_MODEL: z.string().min(1).default('tts-rt-v2'),
  SONIOX_VOICE: z.string().min(1).default('Adrian'),
  SPEECH_AUDIO_DIR: z.string().min(1).default('artifacts/tts/soniox')
};
const speechSchema = z.object(speechConfigFields);
export type SpeechConfig = z.infer<typeof speechSchema>;
export const loadSpeechConfig = (env: NodeJS.ProcessEnv = process.env): SpeechConfig => speechSchema.parse(env);
export const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export const speechRequest = (config: SpeechConfig, id: PromptID) => ({
  model: config.SONIOX_MODEL, language: 'en', voice: config.SONIOX_VOICE,
  audio_format: 'mp3', sample_rate: 24000, bitrate: 64000, text: trialPrompts[id]
});
export const recipeHash = (config: SpeechConfig, id: PromptID): string => digest(JSON.stringify(speechRequest(config, id)));
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const manifestSchema = z.object({ version: z.literal(1), entries: z.record(z.string(),
  z.object({ recipe: hash, sha256: hash, file: z.string().regex(/^[a-f0-9]{64}\.mp3$/) }).strict()) }).strict();
export type SpeechManifest = z.infer<typeof manifestSchema>;
const maxAudioBytes = 1_000_000;

export function validMP3(bytes: Buffer): boolean {
  return bytes.length >= 128 && bytes.length <= maxAudioBytes
    && (bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0));
}

/** Called by an operator build step, never inside a call webhook. No retries or redirects. */
export async function generateSpeech(config: SpeechConfig, id: PromptID, request: typeof fetch = fetch): Promise<Buffer> {
  if (!config.SONIOX_API_KEY) throw new Error('soniox_key_required');
  const response = await request('https://tts-rt.soniox.com/tts', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${config.SONIOX_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(speechRequest(config, id))
  });
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'audio/mpeg') {
    await response.body?.cancel();
    throw new Error('soniox_generation_failed');
  }
  const parts: Uint8Array[] = [];
  let length = 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('soniox_audio_missing');
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > maxAudioBytes) { await reader.cancel(); throw new Error('soniox_audio_too_large'); }
      parts.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(parts);
  if (!validMP3(bytes)) throw new Error('soniox_audio_invalid');
  return bytes;
}

/** The runtime holds verified, immutable, public prompt audio. It needs no Soniox key. */
export async function loadSpeech(config: SpeechConfig, origin: string) {
  const media = new Map<string, Buffer>();
  const paths = new Map<PromptID, string>();
  if (config.TTS_PROVIDER === 'soniox') {
    const manifest = manifestSchema.parse(JSON.parse(await readFile(resolve(config.SPEECH_AUDIO_DIR, 'manifest.json'), 'utf8')));
    for (const id of Object.keys(trialPrompts) as PromptID[]) {
      const entry = manifest.entries[id];
      if (!entry || entry.recipe !== recipeHash(config, id) || entry.file !== `${entry.sha256}.mp3`) {
        throw new Error('speech_cache_stale_run_speech_prepare');
      }
      const bytes = await readFile(resolve(config.SPEECH_AUDIO_DIR, entry.file));
      if (!validMP3(bytes) || digest(bytes) !== entry.sha256) throw new Error('speech_cache_invalid');
      const path = `/speech/${entry.file}`;
      paths.set(id, path);
      media.set(path, bytes);
    }
  }
  return {
    say(target: VoiceResponse | VoiceResponse.Gather, id: PromptID): void {
      const path = paths.get(id);
      if (path) target.play(`${origin}${path}`);
      else target.say({ voice: 'alice', language: 'en-US' }, trialPrompts[id]);
    },
    async register(app: FastifyInstance): Promise<void> {
      // Route registration is an allowlist: no filesystem paths or generation endpoint are exposed.
      for (const [path, bytes] of media) {
        app.get(path, async (_request, reply) => reply.type('audio/mpeg')
          .header('Cache-Control', 'public, max-age=31536000, immutable')
          .header('ETag', `"${digest(bytes)}"`).send(bytes));
      }
    }
  };
}
