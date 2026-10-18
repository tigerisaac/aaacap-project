import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'shield-contact-recovery-'));
try {
  const executable = path.join(directory, 'contact-recovery');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    'ios/Shield/Models/ContactName.swift', 'ios/Shield/Models/SharedContact.swift', 'ios/Shield/Models/SavedNumber.swift',
    'ios/Shield/Networking/APIError.swift', 'ios/Shield/Networking/APIResponses.swift',
    'ios/Shield/Features/Settings/ContactChangeStore.swift', 'ios/Shield/Features/Settings/SharedContactsModel.swift',
    'ios/Shield/App/AppState+AccountDeletion.swift',
    'scripts/tests/contact-recovery.swift'], { stdio: 'inherit' });
  execFileSync(executable, [directory], { stdio: 'inherit' });
} finally { rmSync(directory, { recursive: true, force: true }); }
