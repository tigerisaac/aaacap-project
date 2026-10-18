import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Reuse the exact dependency already pinned for the API; never download a second parser.
const root = resolve(import.meta.dirname, '..');
const dependency = resolve(root, 'node_modules/libphonenumber-js');
const destination = resolve(root, 'ios/Shield/Resources/PhoneNumbers');
const project = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const installed = JSON.parse(await readFile(resolve(dependency, 'package.json'), 'utf8'));
assert.equal(installed.version, project.dependencies['libphonenumber-js']);
const files = {
  'libphonenumber-min.js': await readFile(resolve(dependency, 'bundle/libphonenumber-min.js')),
  'libphonenumber-LICENSE.txt': await readFile(resolve(dependency, 'LICENSE')),
};
const manifest = Buffer.from(JSON.stringify({ package: installed.name, version: installed.version,
  upstream: 'https://github.com/catamphetamine/libphonenumber-js',
  files: Object.fromEntries(Object.entries(files).map(([name, data]) => [name, {
    bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'),
  }])),
}, null, 2) + '\n');
files['libphonenumber-manifest.json'] = manifest;
if (process.argv.includes('--update')) {
  await mkdir(destination, { recursive: true });
  for (const [name, data] of Object.entries(files)) await writeFile(resolve(destination, name), data);
}
for (const [name, data] of Object.entries(files)) {
  assert.deepEqual(await readFile(resolve(destination, name)), data, `Bundled ${name} differs from the pinned API dependency; run node scripts/check-contact-phone-parser.mjs --update`);
}
console.log(JSON.stringify({ verified: true, package: installed.name, version: installed.version, files: Object.keys(files).length }));
