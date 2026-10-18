import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'shield-blocked-pagination-'));
try {
  const executable = path.join(directory, 'blocked-pagination-tests');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    'ios/Shield/Models/BlockedNumber.swift', 'ios/Shield/Models/BlockedNumberPage.swift',
    'ios/Shield/Networking/APIError.swift', 'ios/Shield/Networking/BlockedNumbersLoader.swift',
    'scripts/tests/blocked-numbers.swift'], { stdio: 'inherit' });
  execFileSync(executable, [], { stdio: 'inherit' });
} finally { rmSync(directory, { recursive: true, force: true }); }
