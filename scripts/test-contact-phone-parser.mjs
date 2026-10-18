import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeSharedPhone } from '../dist/cloud/shared-contacts.js';

const fixture = path.resolve('scripts/tests/contact-phone-cases.json');
for (const sample of JSON.parse(readFileSync(fixture, 'utf8'))) {
  assert.ok(normalizeSharedPhone(sample.raw) === sample.normalized, `Backend contract changed for ${sample.id}`);
}
const directory = mkdtempSync(path.join(tmpdir(), 'shield-phone-parser-'));
try {
  const executable = path.join(directory, 'phone-parser-tests');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    'ios/Shield/Features/Settings/ContactPhoneParser.swift', 'ios/Shield/Features/Settings/PhoneContacts.swift',
    'ios/Shield/Models/ContactName.swift', 'ios/Shield/Models/SharedContact.swift',
    'ios/Shield/Models/ContactPhoneBackup.swift', 'ios/Shield/Networking/APIError.swift',
    'scripts/tests/contact-phone-parser.swift'], { stdio: 'inherit' });
  const result = JSON.parse(execFileSync(executable, [fixture,
    path.resolve('ios/Shield/Resources/PhoneNumbers/libphonenumber-min.js')], { encoding: 'utf8' }));
  assert.equal(result.passed, true);
  console.log(JSON.stringify({ ...result, actualBackendIdentity: true, actualPhoneContactsCompiled: true }));
} finally { rmSync(directory, { recursive: true, force: true }); }
