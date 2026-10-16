import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (process.platform !== 'darwin') throw new Error('These iOS guide checks require macOS and the Apple Vision framework.');
const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'ios/Shield/Features/Settings/Forwarding/LiveGuide');
const temporary = mkdtempSync(path.join(tmpdir(), 'shield-guide-recognition-'));
const common = ['LiveSetupInstruction.swift', 'LiveSetupObservation.swift', 'LiveSetupLabelLayout.swift',
  'LiveSetupRecognition.swift', 'LiveSetupStability.swift'].map(name => path.join(source, name));
try {
  for (const [name, extra] of [['recognition', []], ['ocr', [path.join(source, 'LiveSetupTextRecognition.swift')]]]) {
    const executable = path.join(temporary, name);
    execFileSync('swiftc', ['-D', 'DEBUG', '-module-cache-path', path.join(temporary, 'modules'), ...common, ...extra,
      path.join(root, `scripts/test-live-setup-${name}.swift`), '-o', executable], { cwd: root, stdio: 'inherit' });
    execFileSync(executable, [], { cwd: root, stdio: 'inherit' });
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
