import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { digest, generateSpeech, loadSpeechConfig, manifestSchema, recipeHash, trialPrompts, validMP3,
  type PromptID, type SpeechManifest } from '../src/speech.js';

const config = loadSpeechConfig();
if (config.TTS_PROVIDER !== 'soniox') throw new Error('Select Soniox before preparing its speech assets.');
const directory = resolve(config.SPEECH_AUDIO_DIR);
await mkdir(directory, { recursive: true });
const path = resolve(directory, 'manifest.json');
let manifest: SpeechManifest = { version: 1, entries: {} };
try { manifest = manifestSchema.parse(JSON.parse(await readFile(path, 'utf8'))); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('speech_manifest_invalid'); }
for (const id of Object.keys(trialPrompts) as PromptID[]) {
  const previous = manifest.entries[id];
  if (previous && previous.recipe === recipeHash(config, id) && previous.file === `${previous.sha256}.mp3`) {
    try {
      const bytes = await readFile(resolve(directory, previous.file));
      if (validMP3(bytes) && digest(bytes) === previous.sha256) {
        console.log(JSON.stringify({ prompt: id, cached: true }));
        continue;
      }
    } catch { /* An absent or invalid asset must be generated again. */ }
  }
  const started = performance.now();
  const bytes = await generateSpeech(config, id);
  const sha256 = digest(bytes);
  const file = `${sha256}.mp3`;
  await writeFile(resolve(directory, file), bytes);
  manifest.entries[id] = { recipe: recipeHash(config, id), sha256, file };
  // Persist each completed prompt so a later failure does not bill completed work again.
  await writeFile(`${path}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
  await rename(`${path}.tmp`, path);
  console.log(JSON.stringify({ prompt: id, cached: false, bytes: bytes.length, elapsedMs: Math.round(performance.now() - started) }));
}
