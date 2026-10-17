import { describe, expect, it } from 'vitest';
import { recordingURLAllowed } from '../src/cloud/forwarding-provider.js';

describe('provider recording origins', () => {
  it('requires explicit host approval even for the documented Telnyx bucket', () => {
    const url = new URL('https://s3.amazonaws.com/telephony-recorder-prod/synthetic.mp3');
    expect(recordingURLAllowed(url, [])).toBe(false);
    expect(recordingURLAllowed(url, ['s3.amazonaws.com'])).toBe(true);
  });
  it.each([
    'http://s3.amazonaws.com/telephony-recorder-prod/synthetic.mp3',
    'https://s3.amazonaws.com:444/telephony-recorder-prod/synthetic.mp3',
    'https://user:password@s3.amazonaws.com/telephony-recorder-prod/synthetic.mp3',
    'https://s3.amazonaws.com/another-bucket/synthetic.mp3',
    'https://s3.amazonaws.com/telephony-recorder-prod-other/synthetic.mp3',
    'https://s3.amazonaws.com/telephony-recorder-prod/../another-bucket/synthetic.mp3',
    'https://s3.amazonaws.com.example.invalid/telephony-recorder-prod/synthetic.mp3',
    'https://127.0.0.1/telephony-recorder-prod/synthetic.mp3',
  ])('rejects unsafe or unrelated storage: %s', url => {
    expect(recordingURLAllowed(new URL(url), ['s3.amazonaws.com'])).toBe(false);
  });
});
