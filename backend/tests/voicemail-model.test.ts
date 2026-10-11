import { describe, expect, it, vi } from 'vitest';
import { decideVoicemail, decisionRequest, transcribeVoicemail, voicemailVerdict, VOICEMAIL_LIMITS } from '../src/cloud/voicemail-check.js';

const reply = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
const answer = (probabilities: Record<string, number>) => ({ answers: [{ type: 'choice', name: 'voicemail', choice: 'keep',
  probabilities: Object.entries(probabilities).map(([value, probability]) => ({ value, probability })), confidence: 0.9 }] });

describe('voicemail keep-or-remove model', () => {
  it('asks Luna one keep, scam or junk choice about the untrusted transcript', () => {
    const request = decisionRequest('Call me back at "}{ 555');
    expect(request.model).toBe('gpt-6-luna');
    expect(request.questions).toHaveLength(1);
    expect(request.questions[0]).toMatchObject({ type: 'choice', name: 'voicemail' });
    expect(request.questions[0]!.choices.map(c => c.value)).toEqual(['keep', 'scam', 'junk']);
    expect(JSON.parse(request.input).untrustedVoicemailTranscript).not.toMatch(/[{}"]/);
  });
  it('reads each choice probability from the Decisions answer', async () => {
    const fetcher = reply(answer({ keep: 0.05, scam: 0.9, junk: 0.05 }));
    expect(await decideVoicemail('text', 'key', fetcher)).toEqual({ keep: 0.05, scam: 0.9, junk: 0.05 });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/decisions'); expect(init.redirect).toBe('error');
  });
  it.each([
    ['a refusal', reply({ answers: [{ type: 'refusal', name: 'voicemail' }] })],
    ['an HTTP error', reply({}, 500)],
    ['unknown choices only', reply(answer({ delete: 1 }))],
    ['a transport failure', vi.fn().mockRejectedValue(new Error('network'))]
  ])('reads %s as no answer', async (_label, fetcher) => {
    expect(await decideVoicemail('text', 'key', fetcher)).toBeUndefined();
  });
  it('sends the audio to GPT Transcribe and returns its text, or nothing on failure', async () => {
    const fetcher = reply({ text: 'Hi, it is Dr. Lee\'s office.' });
    expect(await transcribeVoicemail(Buffer.from('mp3'), 'key', fetcher)).toBe('Hi, it is Dr. Lee\'s office.');
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect((init.body as FormData).get('model')).toBe('gpt-transcribe');
    expect(await transcribeVoicemail(Buffer.from('mp3'), 'key', reply({}, 429))).toBeUndefined();
    expect(await transcribeVoicemail(Buffer.from('mp3'), 'key', reply({ text: 42 }))).toBeUndefined();
  });
  it('removes only on a confident answer, and always keeps contacts, failures and long silent recordings', () => {
    const base = { savedContact: false, transcript: 'words', duration: 20 };
    expect(voicemailVerdict({ ...base, probabilities: { keep: 0, scam: 1, junk: 0 }, savedContact: true })).toBe('keep');
    expect(voicemailVerdict({ ...base, transcript: undefined })).toBe('keep');
    expect(voicemailVerdict({ ...base })).toBe('keep');
    expect(voicemailVerdict({ ...base, probabilities: { keep: 0.11, scam: 0.5, junk: 0.39 } })).toBe('keep');
    expect(voicemailVerdict({ ...base, probabilities: { keep: 0.1, scam: 0.5, junk: 0.4 } })).toBe('scam');
    expect(voicemailVerdict({ ...base, probabilities: { keep: 0.05, scam: 0.15, junk: 0.8 } })).toBe('junk');
    expect(voicemailVerdict({ ...base, transcript: ' ', duration: VOICEMAIL_LIMITS.silentMaxSeconds })).toBe('junk');
    expect(voicemailVerdict({ ...base, transcript: '', duration: VOICEMAIL_LIMITS.silentMaxSeconds + 1 })).toBe('keep');
  });
});
