import { readFile } from 'node:fs/promises';
import recordings from './announcement-audio/manifest.json' with { type: 'json' };
import { VoiceResponse, type SpeechAudio } from './texml.js';

export const ANNOUNCEMENT_VERSION = 'soniox-grace-2026-10-10';
export const ANNOUNCEMENT_ORIGIN = 'https://shield-calls-isaac.web.app';
const byText = new Map(recordings.map(recording => [recording.text, recording.file]));
const filenames = new Set(recordings.map(recording => recording.file));

/** Only approved, generic text maps to public audio; new or personalized text stays in Say. */
export function announcementAudio(text: string): SpeechAudio | undefined {
  const file = byText.get(text);
  return file ? {
    url: `${ANNOUNCEMENT_ORIGIN}/speech/${ANNOUNCEMENT_VERSION}/${file}`,
    failoverUrl: `${ANNOUNCEMENT_ORIGIN}/public/speech/${ANNOUNCEMENT_VERSION}/${file}`
  } : undefined;
}
export function announcementResponse() { return new VoiceResponse(announcementAudio); }

/** Backup comes from the Functions package, independently of the static Hosting asset. */
export async function readAnnouncement(file: string): Promise<Buffer | undefined> {
  if (!filenames.has(file)) return undefined;
  return readFile(new URL(`./announcement-audio/${file}`, import.meta.url));
}
