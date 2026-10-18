import { createHash } from 'node:crypto';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Small deterministic generator; Swift Package Manager resolves the pinned purchase SDK.
const root = path.resolve(import.meta.dirname, '../ios');
const objects = {};
const id = value => createHash('sha256').update(value).digest('hex').slice(0, 24).toUpperCase();
const add = (key, object) => { const ref = id(key); objects[ref] = object; return ref; };
const files = async directory => {
  const result = [];
  for (const entry of (await readdir(path.join(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory() && !entry.name.endsWith('.xcassets')) result.push(...await files(relative));
    else result.push(relative);
  }
  return result;
};
const type = file => file.endsWith('.swift') ? 'sourcecode.swift' : file.endsWith('.xcassets') ? 'folder.assetcatalog'
  : file.endsWith('.js') ? 'sourcecode.javascript' : file.endsWith('.json') ? 'text.json' : file.endsWith('.txt') ? 'text'
  : file.endsWith('.shortcut') ? 'file' : file.endsWith('.gif') ? 'image.gif' : file.endsWith('.mp4') ? 'video.mp4' : file.endsWith('.png') ? 'image.png' : file.endsWith('.storyboard') ? 'file.storyboard' : file.endsWith('.xcconfig') ? 'text.xcconfig' : file.endsWith('.entitlements') ? 'text.plist.entitlements' : 'text.plist.xml';
const ref = file => add(`file:${file}`, { isa: 'PBXFileReference', lastKnownFileType: type(file), name: path.basename(file), path: file, sourceTree: '<group>' });
const appFiles = await files('Shield');
const extensionFiles = await files('MessageFilter');
const callDirectoryFiles = await files('CallDirectory');
// Compiled into both the app and the Call Directory extension.
const sharedFiles = await files('Shared');
const testFiles = await files('ShieldUITests');
const configFiles = ['Config/Base.xcconfig', 'Config/Debug.xcconfig', 'Config/Release.xcconfig'];
for (const file of [...appFiles, ...extensionFiles, ...callDirectoryFiles, ...sharedFiles, ...testFiles, ...configFiles]) ref(file);
const product = (name, fileType) => add(`product:${name}`, { isa: 'PBXFileReference', explicitFileType: fileType, includeInIndex: 0, path: name, sourceTree: 'BUILT_PRODUCTS_DIR' });
const appProduct = product('Shield.app', 'wrapper.application');
const extensionProduct = product('ShieldMessages.appex', 'wrapper.app-extension');
const callDirectoryProduct = product('ShieldCallDirectory.appex', 'wrapper.app-extension');
const testsProduct = product('ShieldUITests.xctest', 'wrapper.cfbundle');
const group = (name, children) => add(`group:${name}`, { isa: 'PBXGroup', name, children, sourceTree: '<group>' });
const sourceGroup = (name, prefix, paths) => {
  const children = [];
  const directories = new Map();
  for (const file of paths) {
    const remainder = file.slice(prefix.length);
    if (!remainder.includes('/')) children.push(id(`file:${file}`));
    else {
      const directory = remainder.split('/')[0];
      if (!directories.has(directory)) directories.set(directory, []);
      directories.get(directory).push(file);
    }
  }
  for (const [directory, contents] of directories) children.push(sourceGroup(directory, `${prefix}${directory}/`, contents));
  return add(`source-group:${prefix}`, { isa: 'PBXGroup', name, children, sourceTree: '<group>' });
};
const mainGroup = group('root', [sourceGroup('Shield', 'Shield/', appFiles),
  sourceGroup('Message Filter', 'MessageFilter/', extensionFiles), sourceGroup('Call Directory', 'CallDirectory/', callDirectoryFiles),
  sourceGroup('Shared', 'Shared/', sharedFiles), sourceGroup('Tests', 'ShieldUITests/', testFiles),
  group('Configuration', configFiles.map(file => id(`file:${file}`))), group('Products', [appProduct, extensionProduct, callDirectoryProduct, testsProduct])]);
const phase = (target, name, kind, paths) => add(`phase:${target}:${name}`, { isa: kind, buildActionMask: 2147483647,
  files: paths.map(file => add(`build:${target}:${file}`, { isa: 'PBXBuildFile', fileRef: id(`file:${file}`) })), runOnlyForDeploymentPostprocessing: 0 });
const configs = (key, baseSettings = {}) => {
  const values = ['Debug', 'Release'].map(name => add(`config:${key}:${name}`, { isa: 'XCBuildConfiguration',
    ...(key === 'project' ? { baseConfigurationReference: id(`file:Config/${name}.xcconfig`) } : {}),
    buildSettings: { ...baseSettings }, name }));
  return add(`configs:${key}`, { isa: 'XCConfigurationList', buildConfigurations: values, defaultConfigurationIsVisible: 0, defaultConfigurationName: 'Release' });
};
// Keep the unfinished message-filter target available for development, but do not
// build or embed it in Shield until its backend, host and device checks are ready.
const callDirectoryProxy = add('call-directory-proxy', { isa: 'PBXContainerItemProxy', containerPortal: id('project'), proxyType: 1,
  remoteGlobalIDString: id('target:ShieldCallDirectory'), remoteInfo: 'ShieldCallDirectory' });
const callDirectoryDependency = add('call-directory-dependency', { isa: 'PBXTargetDependency', target: id('target:ShieldCallDirectory'), targetProxy: callDirectoryProxy });
const embed = add('phase:embed', { isa: 'PBXCopyFilesBuildPhase', buildActionMask: 2147483647, dstPath: '', dstSubfolderSpec: 13,
  files: [add('build:embed-call-directory', { isa: 'PBXBuildFile', fileRef: callDirectoryProduct, settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] } })],
  name: 'Embed App Extensions', runOnlyForDeploymentPostprocessing: 0 });
const target = (name, targetFiles, productReference, productType, settings, extraPhases = [], dependencies = []) => add(`target:${name}`, {
  isa: 'PBXNativeTarget', buildConfigurationList: configs(name, { SDKROOT: 'iphoneos', TARGETED_DEVICE_FAMILY: '1',
    SUPPORTED_PLATFORMS: 'iphoneos iphonesimulator', SUPPORTS_MACCATALYST: 'NO', SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD: 'NO', PRODUCT_NAME: '$(TARGET_NAME)', ...settings }),
  buildPhases: [phase(name, 'sources', 'PBXSourcesBuildPhase', targetFiles.filter(file => file.endsWith('.swift'))),
    phase(name, 'frameworks', 'PBXFrameworksBuildPhase', []),
    phase(name, 'resources', 'PBXResourcesBuildPhase', targetFiles.filter(file => file.startsWith('Shield/Resources/PhoneNumbers/') || file.endsWith('.shortcut') || file.endsWith('.xcassets') || file.endsWith('.xcprivacy') || file.endsWith('.storyboard') || file.endsWith('.mp4') || file.endsWith('.gif') || file.endsWith('-poster.png'))), ...extraPhases],
  buildRules: [], dependencies, name, productName: name, productReference, productType
});
const appTarget = target('Shield', [...appFiles, ...sharedFiles], appProduct, 'com.apple.product-type.application', {
  PRODUCT_BUNDLE_IDENTIFIER: '$(SHIELD_APP_BUNDLE_ID)', INFOPLIST_FILE: 'Shield/Resources/Info.plist',
  CODE_SIGN_ENTITLEMENTS: 'Shield/Resources/Shield.entitlements', ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
  ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'Action'
}, [embed], [callDirectoryDependency]);
const revenueCat = add('package:revenuecat', { isa: 'XCRemoteSwiftPackageReference',
  repositoryURL: 'https://github.com/RevenueCat/purchases-ios-spm.git',
  requirement: { kind: 'exactVersion', version: '5.96.0' } });
const revenueCatProduct = add('package-product:revenuecat', { isa: 'XCSwiftPackageProductDependency',
  package: revenueCat, productName: 'RevenueCat' });
objects[appTarget].packageProductDependencies = [revenueCatProduct];
objects[id('phase:Shield:frameworks')].files.push(add('build:revenuecat', {
  isa: 'PBXBuildFile', productRef: revenueCatProduct }));
const extensionTarget = target('ShieldMessages', extensionFiles, extensionProduct, 'com.apple.product-type.app-extension', {
  PRODUCT_BUNDLE_IDENTIFIER: '$(SHIELD_APP_BUNDLE_ID).Messages', INFOPLIST_FILE: 'MessageFilter/Info.plist',
  CODE_SIGN_ENTITLEMENTS: 'MessageFilter/MessageFilter.entitlements', APPLICATION_EXTENSION_API_ONLY: 'YES', SKIP_INSTALL: 'YES'
});
const callDirectoryTarget = target('ShieldCallDirectory', [...callDirectoryFiles, ...sharedFiles], callDirectoryProduct, 'com.apple.product-type.app-extension', {
  PRODUCT_BUNDLE_IDENTIFIER: '$(SHIELD_APP_BUNDLE_ID).CallDirectory', INFOPLIST_FILE: 'CallDirectory/Info.plist',
  CODE_SIGN_ENTITLEMENTS: 'CallDirectory/CallDirectory.entitlements', APPLICATION_EXTENSION_API_ONLY: 'YES', SKIP_INSTALL: 'YES'
});
const testProxy = add('tests-proxy', { isa: 'PBXContainerItemProxy', containerPortal: id('project'), proxyType: 1,
  remoteGlobalIDString: appTarget, remoteInfo: 'Shield' });
const testsDependency = add('tests-dependency', { isa: 'PBXTargetDependency', target: appTarget, targetProxy: testProxy });
const testTarget = target('ShieldUITests', testFiles, testsProduct, 'com.apple.product-type.bundle.ui-testing', {
  PRODUCT_BUNDLE_IDENTIFIER: '$(SHIELD_APP_BUNDLE_ID).UITests', GENERATE_INFOPLIST_FILE: 'YES', TEST_TARGET_NAME: 'Shield'
}, [], [testsDependency]);
const project = add('project', { isa: 'PBXProject', attributes: { BuildIndependentTargetsInParallel: 'YES', LastUpgradeCheck: '2700',
  TargetAttributes: { [appTarget]: { CreatedOnToolsVersion: '27.0', SystemCapabilities: { 'com.apple.Push': { enabled: 1 }, 'com.apple.AssociatedDomains': { enabled: 1 },
    'com.apple.ApplicationGroups.iOS': { enabled: 1 }, 'com.apple.InAppPurchase': { enabled: 1 } } },
    [extensionTarget]: { CreatedOnToolsVersion: '27.0' }, [callDirectoryTarget]: { CreatedOnToolsVersion: '27.0', SystemCapabilities: { 'com.apple.ApplicationGroups.iOS': { enabled: 1 } } },
    [testTarget]: { CreatedOnToolsVersion: '27.0', TestTargetID: appTarget } } },
  buildConfigurationList: configs('project', {}), compatibilityVersion: 'Xcode 14.0', developmentRegion: 'en', hasScannedForEncodings: 0,
  knownRegions: ['en', 'Base'], mainGroup, productRefGroup: id('group:Products'), projectDirPath: '', projectRoot: '',
  packageReferences: [revenueCat], targets: [appTarget, extensionTarget, callDirectoryTarget, testTarget] });
const format = (value, level = 0) => {
  const pad = '\t'.repeat(level);
  if (Array.isArray(value)) return `(\n${value.map(item => `${pad}\t${format(item, level + 1)},`).join('\n')}\n${pad})`;
  if (value && typeof value === 'object') return `{\n${Object.entries(value).map(([key, item]) => `${pad}\t${JSON.stringify(key)} = ${format(item, level + 1)};`).join('\n')}\n${pad}}`;
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
};
await mkdir(path.join(root, 'Shield.xcodeproj/xcshareddata/xcschemes'), { recursive: true });
await writeFile(path.join(root, 'Shield.xcodeproj/project.pbxproj'), '// !$*UTF8*$!\n' + format({ archiveVersion: 1, classes: {}, objectVersion: 56, objects, rootObject: project }) + '\n');
const buildable = (targetID, name, productName) => `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${targetID}" BuildableName="${productName}" BlueprintName="${name}" ReferencedContainer="container:Shield.xcodeproj"/>`;
await writeFile(path.join(root, 'Shield.xcodeproj/xcshareddata/xcschemes/Shield.xcscheme'), `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2700" version="1.7">
 <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
  <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">${buildable(appTarget, 'Shield', 'Shield.app')}</BuildActionEntry>
 </BuildActionEntries></BuildAction>
 <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">${buildable(testTarget, 'ShieldUITests', 'ShieldUITests.xctest')}</TestableReference></Testables></TestAction>
 <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">${buildable(appTarget, 'Shield', 'Shield.app')}</BuildableProductRunnable></LaunchAction>
 <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">${buildable(appTarget, 'Shield', 'Shield.app')}</BuildableProductRunnable></ProfileAction>
 <AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>\n`);
console.log(`Generated Shield.xcodeproj: ${appFiles.filter(f => f.endsWith('.swift')).length} app files, embedded call directory, unshipped message-filter target, UI tests.`);
