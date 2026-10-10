import { mkdir, copyFile, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const destination = resolve('artifacts/firebase-functions');
await mkdir(`${destination}/lib/cloud`, { recursive: true });
await mkdir(`${destination}/lib/live`, { recursive: true });
// Cloud code imports evidence matching and the decision model id; policy.js needs its own imports too.
for (const file of ['policy', 'evidence', 'research', 'scam-resources']) await copyFile(`dist/live/${file}.js`, `${destination}/lib/live/${file}.js`);
// Generated public speech assets are no longer deployed; originals remain local
// for a deliberate future Soniox opt-in. Twilio now synthesizes the fixed copy.
await rm(`${destination}/speech`, { recursive: true, force: true });
await rm('deploy/firebase/public/speech', { recursive: true, force: true });
// Whitelist compiled modules only. No .env, credentials, iOS config, logs or local data.
for (const file of ['auth', 'crypto', 'firebase-auth', 'model-config', 'screening', 'speech']) {
  await copyFile(`dist/${file}.js`, `${destination}/lib/${file}.js`);
}
for (const file of await readdir('dist/cloud')) if (file.endsWith('.js')) await copyFile(`dist/cloud/${file}`, `${destination}/lib/cloud/${file}`);
const root = JSON.parse(await readFile('package.json', 'utf8'));
const packages = ['fastify', '@fastify/formbody', '@fastify/helmet', 'firebase-admin', 'firebase-functions', 'libphonenumber-js', 'openai', 'twilio', 'zod'];
await writeFile(`${destination}/package.json`, JSON.stringify({ name: 'shield-firebase', private: true, type: 'module',
  main: 'lib/cloud/index.js', engines: { node: '22', npm: '11.4.2' }, overrides: root.overrides,
  dependencies: Object.fromEntries(packages.map(name => [name, root.dependencies[name]])) }, null, 2) + '\n');
console.log('Packaged Firebase functions with Twilio speech; no Soniox assets or credentials included.');
