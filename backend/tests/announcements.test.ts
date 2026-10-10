import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import recordings from '../src/cloud/announcement-audio/manifest.json' with { type: 'json' };
import { announcementAudio, announcementResponse, readAnnouncement } from '../src/cloud/announcements.js';
import { purposes } from '../src/cloud/copy.js';
import { warningText } from '../src/cloud/monitoring.js';

describe('Prerecorded Soniox announcements', () => {
  it('has intact, nonempty 24 kHz mono PCM recordings with correct WAV lengths', async () => {
    for (const recording of recordings) {
      const audio = (await readAnnouncement(recording.file))!;
      expect(createHash('sha256').update(audio).digest('hex')).toBe(recording.sha256);
      expect(audio.toString('ascii', 0, 4)).toBe('RIFF');
      expect(audio.toString('ascii', 8, 12)).toBe('WAVE');
      expect(audio.readUInt32LE(4)).toBe(audio.length - 8);
      expect(audio.readUInt16LE(20)).toBe(1); // PCM
      expect(audio.readUInt16LE(22)).toBe(1); // mono
      expect(audio.readUInt32LE(24)).toBe(24000);
      expect(audio.readUInt32LE(40)).toBe(audio.length - 44);
      expect(audio.length).toBeGreaterThan(44);
    }
  });
  it('covers every recipient purpose and monitoring warning with the current exact wording', () => {
    for (const label of [...Object.values(purposes), 'a routine matter']) {
      expect(announcementAudio(`Shield screened a call about ${label}. This does not verify who is calling. Press 1 to connect, or 2 for voicemail.`)).toBeDefined();
    }
    for (const concern of ['code_or_password', 'payment_or_transfer', 'remote_access', 'identity_numbers', 'secrecy', 'investment', '']) {
      expect(announcementAudio(warningText(concern))).toBeDefined();
    }
  });
  it('preserves Gather acceptance and supplies a backup without continuing past playback failures', () => {
    const r = announcementResponse();
    r.gather({ input: ['dtmf'], numDigits: 1, action: 'https://example.com/accept', method: 'POST' })
      .say('Shield screened a call about Personal call. This does not verify who is calling. Press 1 to connect, or 2 for voicemail.');
    r.hangup();
    expect(r.toString()).toContain('<Play failoverUrl="https://shield-calls-isaac.web.app/public/speech/');
    expect(r.toString()).toContain('/offer-personal.wav</Play></Gather><Hangup/>');
    expect(r.toString()).not.toContain('continueOnError');
  });
  it('keeps unrecognized or personalized wording out of the public catalog', async () => {
    const r = announcementResponse(); r.say('A new message for Tom & Jerry');
    expect(r.toString()).toContain('<Say>A new message for Tom &amp; Jerry</Say>');
    expect(announcementAudio('A new message for Tom & Jerry')).toBeUndefined();
    expect(await readAnnouncement('../.env.speech')).toBeUndefined();
    expect(await readAnnouncement('unknown.wav')).toBeUndefined();
  });
});
