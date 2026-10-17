import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// This creates a disposable, separately identified app. It never rewrites the
// canonical Xcode project, configures a live Shield account, or embeds an SDK key.
const root = path.resolve(import.meta.dirname, '..');
const output = process.argv[2] && path.resolve(process.argv[2]);
assert.ok(output && output.startsWith(path.join(root, 'artifacts/private/')), 'Choose a new directory under artifacts/private/');
await mkdir(output, { recursive: false, mode: 0o700 });
const source = path.join(output, 'source');
await mkdir(source);
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const archive = path.join(output, 'source.tar');
execFileSync('git', ['archive', '--format=tar', '-o', archive, revision, 'ios', 'scripts/generate-xcode-project.mjs'], { cwd: root });
execFileSync('tar', ['-xf', archive, '-C', source]);
await rm(archive);

const diagnostics = path.join(root, 'ios/Diagnostics/RevenueCat');
await cp(path.join(root, 'ios/Shield/Features/Subscription/RevenueCatClient.swift'),
    path.join(source, 'ios/Shield/Features/Subscription/RevenueCatClient.swift'));
await cp(path.join(diagnostics, 'ShieldApp.swift'), path.join(source, 'ios/Shield/App/ShieldApp.swift'));
await mkdir(path.join(source, 'ios/Shield/Diagnostics'));
for (const name of ['RevenueCatSDKVerificationModel.swift', 'RevenueCatSDKVerificationView.swift']) {
  await cp(path.join(diagnostics, name), path.join(source, 'ios/Shield/Diagnostics', name));
}
await rm(path.join(source, 'ios/ShieldUITests'), { recursive: true });
await mkdir(path.join(source, 'ios/ShieldUITests'));
await cp(path.join(diagnostics, 'RevenueCatSDKUITests.swift'), path.join(source, 'ios/ShieldUITests/RevenueCatSDKUITests.swift'));
const debug = path.join(source, 'ios/Config/Debug.xcconfig');
await writeFile(debug, (await readFile(debug, 'utf8')) + '\n// Dedicated SDK test build only.\nSWIFT_ACTIVE_COMPILATION_CONDITIONS = $(inherited) DEBUG SHIELD_REVENUECAT_TEST_STORE\nSHIELD_APP_BUNDLE_ID = org.isaaczhang.Shield.RevenueCatQA\n');
execFileSync(process.execPath, [path.join(source, 'scripts/generate-xcode-project.mjs')], { cwd: source, stdio: 'ignore' });
await writeFile(path.join(output, 'preparation.json'), JSON.stringify({ baseRevision: revision, source,
  bundleID: 'org.isaaczhang.Shield.RevenueCatQA', buildConfiguration: 'Debug',
  onlyTestStoreKeys: true, shieldBackendStarted: false, keyEmbedded: false,
  sourceOverrides: ['RevenueCatClient.swift', 'diagnostic entry point, model, view and UI tests'],
}, null, 2) + '\n');
console.log(JSON.stringify({ prepared: true, source, baseRevision: revision, keyEmbedded: false }));
