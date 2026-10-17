import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'shield-subscription-test-'));
try {
  const executable = path.join(directory, 'subscription-tests');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    'ios/Shield/Models/ServiceAccessStatus.swift', 'ios/Shield/Networking/APIError.swift',
    'ios/Shield/Features/Subscription/SubscriptionClient.swift', 'ios/Shield/Features/Subscription/SubscriptionModel.swift',
    'scripts/tests/subscriptions.swift'], { stdio: 'inherit' });
  execFileSync(executable, [], { stdio: 'inherit' });
} finally { rmSync(directory, { recursive: true, force: true }); }
