import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { normalizeSharedPhone } from '../src/cloud/shared-contacts.js';

type Sample = { id: string; raw: string; normalized: string };
const samples = JSON.parse(readFileSync('scripts/tests/contact-phone-cases.json', 'utf8')) as Sample[];
const context = createContext({});
runInContext(readFileSync('ios/Shield/Resources/PhoneNumbers/libphonenumber-min.js', 'utf8'), context, { timeout: 1000 });
const parse = runInContext('(raw) => { const value = libphonenumber.parsePhoneNumberFromString(raw, "US"); return value?.isValid() ? value.number : undefined; }', context) as (value: string) => string | undefined;

describe('bundled iPhone parser and actual shared-contact identity', () => {
  for (const sample of samples) {
    it(`agrees for ${sample.id}`, () => {
      expect(normalizeSharedPhone(sample.raw) === sample.normalized).toBe(true);
      expect(parse(sample.raw) === normalizeSharedPhone(sample.raw)).toBe(true);
    });
  }
  it('does not turn invalid saved fields into routing numbers', () => {
    for (const value of ['', '12', 'not a number', '+', '9'.repeat(300)]) {
      expect(normalizeSharedPhone(value)).toBeUndefined();
      expect(parse(value)).toBeUndefined();
    }
  });
});
