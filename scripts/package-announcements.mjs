import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const source = 'backend/src/cloud/announcement-audio';
const version = 'soniox-grace-2026-10-12';
const recordings = JSON.parse(await readFile(`${source}/manifest.json`, 'utf8'));
const destinations = ['dist/cloud/announcement-audio', `deploy/firebase/public/speech/${version}`];
for (const destination of destinations) await mkdir(destination, { recursive: true });
for (const recording of recordings) {
  if (!/^[a-z0-9_-]+\.wav$/.test(recording.file)) throw new Error('invalid_announcement_filename');
  const path = `${source}/${recording.file}`;
  const audio = await readFile(path);
  if (createHash('sha256').update(audio).digest('hex') !== recording.sha256) throw new Error(`announcement_integrity_failed: ${recording.file}`);
  for (const destination of destinations) await copyFile(path, `${destination}/${recording.file}`);
}
console.log(`Packaged ${recordings.length} Soniox recordings for Hosting and Functions backup.`);
