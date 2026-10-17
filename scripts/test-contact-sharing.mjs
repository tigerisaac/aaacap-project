import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sharedContactsSchema, normalizeSharedPhone } from '../dist/cloud/shared-contacts.js';

const directory = mkdtempSync(path.join(tmpdir(), 'shield-contact-test-'));
try {
  const executable = path.join(directory, 'contact-sharing-tests');
  execFileSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library', '-o', executable,
    'ios/Shield/Models/ContactName.swift', 'ios/Shield/Models/SharedContact.swift', 'scripts/tests/contact-sharing.swift'], { stdio: 'inherit' });
  const result = JSON.parse(execFileSync(executable, [], { encoding: 'utf8' }));
  const payload = sharedContactsSchema.parse({ contacts: result.contacts });
  sharedContactsSchema.parse({ contacts: result.labelCases });
  assert.equal(result.locallySkipped, 3);
  assert.equal(payload.contacts.filter(contact => normalizeSharedPhone(contact.phone)).length, 2);
  const serverSkipped = payload.contacts.filter(contact => !normalizeSharedPhone(contact.phone)).length;
  assert.equal(result.locallySkipped + serverSkipped, 4);
  assert.ok(payload.contacts.every(contact => Object.keys(contact).sort().join(',') === 'label,phone'));
  for (const name of result.manualNames) {
    const parsed = sharedContactsSchema.safeParse({ contacts: [{ label: name.raw, phone: '+12025550181' }] });
    assert.equal(name.accepted, parsed.success, `Manual name disagrees with the API: ${JSON.stringify(name.raw)}`);
    if (parsed.success) assert.equal(name.cleaned, parsed.data.contacts[0].label);
  }
  console.log(JSON.stringify({ passed: true, actualBackendSchema: true,
    localSkipped: result.locallySkipped, serverSkipped, shared: 2, unicodeCases: result.labelCases.length,
    manualNameCases: result.manualNames.length }));
} finally { rmSync(directory, { recursive: true, force: true }); }
