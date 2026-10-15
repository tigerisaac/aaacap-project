import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

// Keep the owner's selected artwork as the source of truth. Color assets are
// maintained in the catalog; rebuilding the identity must not reset the theme.
const root = path.resolve(import.meta.dirname, '..');
const artwork = path.join(root, 'artwork/identity');
const assets = path.join(root, 'ios/Shield/Resources/Assets.xcassets');
const source = path.join(artwork, 'shield-app-icon-1024.png');
const manifest = JSON.parse(await readFile(path.join(artwork, 'manifest.json'), 'utf8'));
const icon = await readFile(source);
if (createHash('sha256').update(icon).digest('hex') !== manifest.assetHashes['shield-app-icon-1024.png']) {
  throw new Error('The app icon does not match the selected identity manifest.');
}
if (process.platform !== 'darwin') throw new Error('Regenerating LaunchMark requires SwiftUI on macOS.');

const info = { author: 'xcode', version: 1 };
for (const [name, directory, extra] of [
  ['AppIcon', 'AppIcon.appiconset', { platform: 'ios', size: '1024x1024' }],
  ['ShieldMark', 'ShieldMark.imageset', {}],
  ['LaunchMark', 'LaunchMark.imageset', {}],
]) {
  const destination = path.join(assets, directory);
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, 'Contents.json'), JSON.stringify({
    images: [{ filename: `${name}.png`, idiom: 'universal', ...extra }], info,
  }, null, 2) + '\n');
  if (name !== 'LaunchMark') await copyFile(source, path.join(destination, `${name}.png`));
}
const cache = await mkdtemp(path.join(os.tmpdir(), 'shield-brand-'));
try {
  await promisify(execFile)('swift', [
    '-module-cache-path', cache,
    path.join(root, 'scripts/make-launch-mark.swift'), source,
    path.join(assets, 'LaunchMark.imageset/LaunchMark.png'),
  ]);
} finally {
  await rm(cache, { recursive: true, force: true });
}
console.log('Updated AppIcon, ShieldMark and LaunchMark from the selected rounded S-shield.');
