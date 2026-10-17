import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

// Inspect the actual release artifact, not just source build settings. Signing,
// App Store acceptance, APNs and physical-device behavior are separate checks.
assert.ok(process.argv[2], 'Usage: npm run ios:verify-archive -- /absolute/path/Shield.xcarchive');
const archive = resolve(process.argv[2]);
const app = join(archive, 'Products/Applications/Shield.app');
const plist = file => JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
const info = plist(join(app, 'Info.plist'));
assert.equal(info.ShieldAPIScheme, 'https');
assert.ok(info.ShieldAPIHost && !/localhost|127\.|\.example$|\$\(/.test(info.ShieldAPIHost));
assert.equal(info.ShieldAPNSEnvironment, 'production');
assert.notEqual(info.NSAppTransportSecurity?.NSAllowsLocalNetworking, true);
assert.notEqual(info.NSAppTransportSecurity?.NSAllowsArbitraryLoads, true);

const extensions = (await readdir(join(app, 'PlugIns'))).filter(name => name.endsWith('.appex')).sort();
assert.deepEqual(extensions, ['ShieldCallDirectory.appex'], 'Do not ship the unfinished message-filter extension');
const bundles = [app, ...extensions.map(name => join(app, 'PlugIns', name))];
const bundleSummary = [];
for (const bundle of bundles) {
  const metadata = plist(join(bundle, 'Info.plist'));
  assert.equal(metadata.CFBundleVersion, info.CFBundleVersion);
  assert.equal(metadata.CFBundleShortVersionString, info.CFBundleShortVersionString);
  assert.equal(metadata.MinimumOSVersion, info.MinimumOSVersion);
  const executable = join(bundle, metadata.CFBundleExecutable);
  const architecture = execFileSync('/usr/bin/lipo', ['-archs', executable], { encoding: 'utf8' }).trim();
  assert.equal(architecture, 'arm64');
  bundleSummary.push({ path: relative(app, bundle) || '.', identifier: metadata.CFBundleIdentifier, architecture });
}

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile()) files.push(path);
  }
}
await walk(app);
const privacyFiles = files.filter(file => file.endsWith('/PrivacyInfo.xcprivacy'));
assert.deepEqual(privacyFiles.map(file => relative(app, file)).sort(), [
  'PlugIns/ShieldCallDirectory.appex/PrivacyInfo.xcprivacy',
  'PrivacyInfo.xcprivacy',
  'RevenueCat_RevenueCat.bundle/PrivacyInfo.xcprivacy',
]);
for (const file of privacyFiles) assert.equal(plist(file).NSPrivacyTracking, false);
const privacy = plist(join(app, 'PrivacyInfo.xcprivacy'));
for (const name of ['PurchaseHistory', 'UserID']) {
  const item = privacy.NSPrivacyCollectedDataTypes.find(value => value.NSPrivacyCollectedDataType === `NSPrivacyCollectedDataType${name}`);
  assert.ok(item, `Missing ${name} privacy declaration`);
  assert.equal(item.NSPrivacyCollectedDataTypeLinked, true);
  assert.ok(item.NSPrivacyCollectedDataTypePurposes.includes('NSPrivacyCollectedDataTypePurposeAnalytics'));
}
for (const file of files.filter(file => file.endsWith('.plist'))) {
  assert.ok(!JSON.stringify(plist(file)).includes('api.shield.example'), 'Placeholder server found in archived metadata');
}
const binary = await readFile(join(app, info.CFBundleExecutable));
for (const marker of ['--uitesting', 'appl_synthetic', 'synthetic-server-credential', '--forwarding-start-checks',
  'RevenueCatSDKVerification', 'SHIELD_RC_TEST_KEY', 'shield_qa_monthly', 'shield_qa_annual']) {
  assert.ok(!binary.includes(Buffer.from(marker)), `Release binary contains a test fixture: ${marker}`);
}
console.log(JSON.stringify({ archive, verified: true, distributionSigningVerified: false,
  version: info.CFBundleShortVersionString, build: info.CFBundleVersion, minimumOS: info.MinimumOSVersion,
  apiHost: info.ShieldAPIHost, developmentNetworkingException: false, messageFilterEmbedded: false,
  bundles: bundleSummary, privacyManifests: privacyFiles.map(file => relative(app, file)).sort(),
  appBinarySha256: createHash('sha256').update(binary).digest('hex'),
}, null, 2));
