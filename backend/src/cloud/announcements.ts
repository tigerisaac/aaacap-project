import { readFile } from 'node:fs/promises';
import recordings from './announcement-audio/manifest.json' with { type: 'json' };
import { VoiceResponse, type SpeechAudio } from './texml.js';

export const ANNOUNCEMENT_VERSION = 'soniox-grace-2026-10-12';
export const ANNOUNCEMENT_ORIGIN = 'https://shield-calls-isaac.web.app';
export const ANNOUNCEMENT_BACKUP_VOICE = 'AWS.Polly.Joanna';
export const failedPlayback = (status?: string) => ['failed', 'file_not_found', 'unknown'].includes(status ?? '');
export const rejectedAudioCommand = (error: unknown) => error instanceof Error && ['telnyx_http_400', 'telnyx_http_422'].includes(error.message);
export const CAPTURE_GREETING = "I'm Shield, an AI call assistant. I may save your message if this call isn't connected. Who's calling, and what is the call about?";
export const CAPTURE_VOICEMAIL = 'You have reached Shield voicemail. Please leave a message. Press pound when finished.';
export const SOUND_CHECK_MESSAGE = 'Hello, this is your Shield sound check. If you can hear me, press 1 on your phone keypad.';
export const ROUTING_TEST_MESSAGE = 'Shield routing test. Press 1 if you called test line A, 2 for test line B, or 0 if you dialed this test service directly. Then stay on the line. The test can last two minutes. Nothing is recorded.';
export const ROUTING_TEST_HOLD = 'The routing test is still running. Please keep this call connected.';
const byText = new Map(recordings.map(recording => [recording.text, recording.file]));
const filenames = new Set(recordings.map(recording => recording.file));

/** Only approved, generic text maps to public audio. */
export function announcementAudio(text: string): SpeechAudio | undefined {
  const file = byText.get(text);
  return file ? {
    url: `${ANNOUNCEMENT_ORIGIN}/speech/${ANNOUNCEMENT_VERSION}/${file}`,
    failoverUrl: `${ANNOUNCEMENT_ORIGIN}/public/speech/${ANNOUNCEMENT_VERSION}/${file}`
  } : undefined;
}
/** Only cataloged generic wording can be played or retried with the backup voice. */
export function requiredAnnouncementAudio(text: string): SpeechAudio {
  const audio = announcementAudio(text);
  if (!audio) throw new Error('announcement_missing');
  return audio;
}
export function announcementResponse() { return new VoiceResponse(requiredAnnouncementAudio); }

/** Backup comes from the Functions package, independently of the static Hosting asset. */
export async function readAnnouncement(file: string): Promise<Buffer | undefined> {
  if (!filenames.has(file)) return undefined;
  return readFile(new URL(`./announcement-audio/${file}`, import.meta.url));
}
