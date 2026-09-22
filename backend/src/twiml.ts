import twilio from 'twilio';
import type { Config } from './config.js';
import { purposes } from './screening.js';

export const hangup = (): string => { const xml = new twilio.twiml.VoiceResponse(); xml.hangup(); return xml.toString(); };
export const link = (config: Config, path: string, id: string): string => `${config.PUBLIC_BASE_URL}${path}?session=${encodeURIComponent(id)}`;

export function introduction(config: Config, id: string): string {
  const xml = new twilio.twiml.VoiceResponse();
  const gather = xml.gather({ input: ['speech', 'dtmf'], numDigits: 1, timeout: 7, speechTimeout: 'auto',
    language: 'en-US', actionOnEmptyResult: true, action: link(config, '/voice/screening-result', id), method: 'POST' });
  gather.say("Hello, this is Shield. Your reply is transcribed for screening. What's your reason for calling? Or press 2 to leave a message.");
  xml.hangup();
  return xml.toString();
}

export function voicemail(config: Config, id: string, prefix?: string): string {
  const xml = new twilio.twiml.VoiceResponse();
  if (prefix) xml.say(prefix);
  xml.say('Please leave a message after the tone. Your message will be recorded and shared with the person you called. Do not include passwords, codes, account numbers, or other private details.');
  xml.record({ maxLength: config.MAX_VOICEMAIL_SECONDS, timeout: 5, playBeep: true, trim: 'trim-silence',
    action: link(config, '/voice/voicemail-complete', id), method: 'POST',
    recordingStatusCallback: link(config, '/voice/recording-ready', id), recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: ['completed'] });
  xml.hangup();
  return xml.toString();
}

export function callback(config: Config, id: string, did: string, destination: string): string {
  const xml = new twilio.twiml.VoiceResponse();
  xml.say('Please stay on the line while we offer your call.');
  const dial = xml.dial({ callerId: did, timeout: config.CALLBACK_TIMEOUT_SECONDS,
    timeLimit: config.MAX_BRIDGE_SECONDS, record: 'do-not-record',
    action: link(config, '/voice/dial-complete', id), method: 'POST' });
  dial.number({ url: link(config, '/voice/whisper', id), method: 'POST',
    statusCallback: link(config, '/voice/child-status', id), statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'] }, destination);
  xml.hangup();
  return xml.toString();
}

export function whisper(config: Config, id: string, purpose: string): string {
  const xml = new twilio.twiml.VoiceResponse();
  const title = purposes[purpose as keyof typeof purposes] ?? purposes.unknown;
  const gather = xml.gather({ input: ['dtmf'], numDigits: 1, timeout: 7, actionOnEmptyResult: true,
    action: link(config, '/voice/accept', id), method: 'POST' });
  // Only this fixed vocabulary is spoken. Caller text is never interpolated.
  gather.say(`Shield screened an unfamiliar call about a ${title.toLowerCase()}. Their identity is not verified. Press 1 to speak with them, or 2 to take a message.`);
  xml.hangup();
  return xml.toString();
}

export function finish(message?: string): string {
  const xml = new twilio.twiml.VoiceResponse();
  if (message) xml.say(message);
  xml.hangup();
  return xml.toString();
}

// An empty response is intentional ONLY after the server has persisted a valid private acceptance.
export function accepted(): string { return new twilio.twiml.VoiceResponse().toString(); }
