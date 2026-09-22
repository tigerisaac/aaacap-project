import { mkdir, copyFile, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadSpeech, loadSpeechConfig } from '../dist/speech.js';

const destination = resolve('artifacts/firebase-functions');
await mkdir(`${destination}/lib/cloud`, { recursive: true });
await mkdir(`${destination}/speech`, { recursive: true });
await mkdir('deploy/firebase/public/speech', { recursive: true });
// Whitelist compiled modules only. No .env, credentials, iOS config, logs or local data.
for (const file of ['auth', 'crypto', 'firebase-auth', 'model-config', 'screening', 'speech']) {
  await copyFile(`dist/${file}.js`, `${destination}/lib/${file}.js`);
}
for (const file of await readdir('dist/cloud')) if (file.endsWith('.js')) await copyFile(`dist/cloud/${file}`, `${destination}/lib/cloud/${file}`);
await loadSpeech(loadSpeechConfig({ TTS_PROVIDER: 'soniox' }), 'https://shield-calls-isaac.web.app');
const manifest = JSON.parse(await readFile('artifacts/tts/soniox/manifest.json', 'utf8'));
await copyFile('artifacts/tts/soniox/manifest.json', `${destination}/speech/manifest.json`);
for (const { file } of Object.values(manifest.entries)) {
  await copyFile(`artifacts/tts/soniox/${file}`, `${destination}/speech/${file}`);
  await copyFile(`artifacts/tts/soniox/${file}`, `deploy/firebase/public/speech/${file}`);
}
const root = JSON.parse(await readFile('package.json', 'utf8'));
const packages = ['fastify', '@fastify/formbody', '@fastify/helmet', 'firebase-admin', 'firebase-functions', 'libphonenumber-js', 'openai', 'twilio', 'zod'];
await writeFile(`${destination}/package.json`, JSON.stringify({ name: 'shield-firebase', private: true, type: 'module',
  main: 'lib/cloud/index.js', engines: { node: '22', npm: '11.4.2' }, overrides: root.overrides,
  dependencies: Object.fromEntries(packages.map(name => [name, root.dependencies[name]])) }, null, 2) + '\n');
console.log('Packaged Firebase functions and verified fixed Soniox prompts.');
