import { cp, mkdir, readFile, writeFile, readdir, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Local files only. Run npm run build, package-firebase.mjs and
// deploy-live-bridge.mjs package first. Never uploads, deploys or contacts a provider.
// Frozen sources below were retained from the verified October 16 deployments.
const root = 'artifacts/private/paid-pilot-25-release';
const apiBase = 'artifacts/private/audio-delivery-release/shieldApi-package';
const bridgeBase = 'artifacts/private/on-demand-call-release/bridge-package';
const preservedAPI = ['cloud/voicemail-check.js', 'cloud/message-summary.js', 'cloud/message-check.js', 'cloud/monitoring.js',
  'live/policy.js', 'live/evidence.js', 'live/research.js', 'live/scam-resources.js'];
const hash = data => createHash('sha256').update(data).digest('hex');
if (!(await readFile(`${apiBase}/lib/cloud/voicemail-check.js`, 'utf8')).includes("'2026-10-12-voicemail-v4'")) throw new Error('approved_message_policy_snapshot_required');
if (!(await readFile(`${bridgeBase}/lib/live/policy.js`, 'utf8')).includes("'2026-10-13-general-v158'")) throw new Error('approved_screening_snapshot_required');
await mkdir(root, { recursive: true, mode: 0o700 });
for (const kind of ['api', 'bridge']) await rm(`${root}/${kind}`, { recursive: true, force: true });
await cp('artifacts/firebase-functions', `${root}/api`, { recursive: true, filter: path => !path.split('/').includes('node_modules') });
for (const file of preservedAPI) await copyFile(`${apiBase}/lib/${file}`, `${root}/api/lib/${file}`);
// The bridge needs only capacity changes. Preserve its deployed screening engine,
// policies, runtime helpers and dependency manifest rather than rebuilding all of main.
await cp(bridgeBase, `${root}/bridge`, { recursive: true, filter: path => !path.split('/').includes('node_modules') });
for (const file of ['live/server.js', 'cloud/forwarding-store.js', 'cloud/shared-routing.js', 'cloud/pilot-limits.json']) {
  await copyFile(`dist/${file}`, `${root}/bridge/lib/${file}`);
}
const changes = async (base, candidate) => {
  const results = [];
  for (const folder of ['', 'cloud', 'live']) {
    for (const name of await readdir(`${candidate}/lib/${folder}`)) {
      if (!/\.(js|json)$/.test(name)) continue;
      const file = [folder, name].filter(Boolean).join('/');
      const after = hash(await readFile(`${candidate}/lib/${file}`));
      let before = null; try { before = hash(await readFile(`${base}/lib/${file}`)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (before !== after) results.push({ file, before, after });
    }
  }
  return results;
};
const manifest = { preparedAt: new Date().toISOString(), deployed: false, liveSettingsChanged: false,
  apiChanges: await changes(apiBase, `${root}/api`), bridgeChanges: await changes(bridgeBase, `${root}/bridge`),
  preservedAPI: await Promise.all(preservedAPI.map(async file => ({ file, sha256: hash(await readFile(`${root}/api/lib/${file}`)) }))),
  screeningPolicy: '2026-10-13-general-v158', messagePolicy: '2026-10-12-voicemail-v4',
  activationRequires: ['owner approval', 'Telnyx account and resource capacity', 'reviewed funding', 'Verify and messaging provider setup', 'custom-token signing permission', 'real-call qualification'] };
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
for (const mode of [[], ['--hybrid']]) execFileSync(process.execPath, ['scripts/check-live-package.mjs', `${root}/bridge`, ...mode], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/check-paid-pilot-package.mjs', `${root}/api`], { stdio: 'inherit' });
console.log(JSON.stringify({ release: root, apiChangedModules: manifest.apiChanges.length, bridgeChangedModules: manifest.bridgeChanges.length,
  screeningPolicy: manifest.screeningPolicy, messagePolicy: manifest.messagePolicy, deployed: false }));
