import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'shield-call-directory-test-'));
try {
  const executable = path.join(directory, 'call-directory-tests');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    'ios/Shared/CallDirectoryList.swift', 'ios/Shield/Features/Settings/CallDirectoryCoordinator.swift',
    'scripts/tests/call-directory.swift'], { stdio: 'inherit' });
  execFileSync(executable, [], { stdio: 'inherit' });
} finally { rmSync(directory, { recursive: true, force: true }); }
