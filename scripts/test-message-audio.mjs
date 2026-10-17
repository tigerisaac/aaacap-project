import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'shield-audio-test-'));
try {
  const executable = path.join(directory, 'message-audio-tests');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    ...['CallRecord', 'CallOutcome', 'Voicemail', 'Person', 'Overview'].map(name => `ios/Shield/Models/${name}.swift`),
    'ios/Shield/Networking/APIError.swift', 'ios/Shield/Features/Calls/MessageAudioStore.swift',
    'ios/Shield/Features/Calls/MessageAudioDelivery.swift', 'ios/Shield/App/OfflineHistory.swift', 'scripts/tests/offline-history.swift', 'scripts/tests/message-audio.swift'], { stdio: 'inherit' });
  execFileSync(executable, [], { stdio: 'inherit' });
} finally { rmSync(directory, { recursive: true, force: true }); }
