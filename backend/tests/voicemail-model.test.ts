import { describe, expect, it, vi } from 'vitest';
import { decideVoicemail, decisionRequest, transcribeVoicemail, voicemailVerdict, VOICEMAIL_LIMITS } from '../src/cloud/voicemail-check.js';

const reply = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
const answer = (verdict: string, clear = true, evidence = 'synthetic words', summary: string | null = null) => ({ id: 'resp_test', status: 'completed',
  output: [{ type: 'message', id: 'msg_test', status: 'completed', role: 'assistant', content: [{ type: 'output_text', annotations: [], text: JSON.stringify({ verdict, clear, evidence, summary }) }] }] });

describe('saved message content check', () => {
  it('uses a structured, storage-disabled Responses request with untrusted input', () => {
    const request = decisionRequest('Call me back at "}{ 555');
    expect(request.model).toBe('gpt-6-luna'); expect(request.store).toBe(false);
    expect(request.text.format).toMatchObject({ type: 'json_schema', strict: true });
    expect(JSON.parse(request.input[0]!.content).untrustedVoicemailTranscript).not.toMatch(/[{}\"]/);
  });
  it('reads an evidence-grounded assessment without requiring Decisions API access', async () => {
    const fetcher = reply(answer('scam'));
    expect(await decideVoicemail('synthetic words', 'key', fetcher)).toEqual({ verdict: 'scam', clear: true, evidence: 'synthetic words', summary: null });
    expect(fetcher.mock.calls[0]![0]).toBe('https://api.openai.com/v1/responses');
  });
  it('gets the decision and attributed summary in one response, rejecting supplied contact details', async () => {
    const fetcher = reply(answer('keep', false, '', 'The caller reported an appointment on 2026-10-15.'));
    expect((await decideVoicemail('synthetic words', 'key', fetcher))?.summary).toBe('The caller reported an appointment on 2026-10-15.');
    expect(fetcher).toHaveBeenCalledOnce();
    expect((await decideVoicemail('synthetic words', 'key', reply(answer('keep', false, '', 'Call 202-555-0199.'))))?.summary).toBeNull();
  });
  it.each([
    ['a refusal', reply({ id: 'resp_test', status: 'completed', output: [] })],
    ['an HTTP error', reply({}, 403)],
    ['an unknown verdict', reply(answer('delete'))],
    ['a transport failure', vi.fn().mockRejectedValue(new Error('network'))]
  ])('reads %s as no answer', async (_label, fetcher) => {
    expect(await decideVoicemail('text', 'key', fetcher)).toBeUndefined();
  });
  it('sends audio to GPT Transcribe and returns its text, or nothing on failure', async () => {
    const fetcher = reply({ text: 'A synthetic appointment notice.' });
    expect(await transcribeVoicemail(Buffer.from('mp3'), 'key', fetcher)).toBe('A synthetic appointment notice.');
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions'); expect((init.body as FormData).get('model')).toBe('gpt-transcribe');
    expect(await transcribeVoicemail(Buffer.from('mp3'), 'key', reply({}, 429))).toBeUndefined();
    expect(await transcribeVoicemail(Buffer.from('mp3'), 'key', reply({ text: 42 }))).toBeUndefined();
  });
  it('keeps failures, uncertainty and unsupported evidence, and removes only a clear supported assessment', () => {
    const base = { transcript: 'synthetic words', duration: 20 };
    expect(voicemailVerdict({ ...base, transcript: undefined })).toBe('keep');
    expect(voicemailVerdict(base)).toBe('keep');
    expect(voicemailVerdict({ ...base, assessment: { verdict: 'scam', clear: false, evidence: 'synthetic words', summary: null } })).toBe('keep');
    expect(voicemailVerdict({ ...base, assessment: { verdict: 'scam', clear: true, evidence: 'invented evidence', summary: null } })).toBe('keep');
    expect(voicemailVerdict({ ...base, assessment: { verdict: 'scam', clear: true, evidence: 'synthetic words', summary: null } })).toBe('scam');
    expect(voicemailVerdict({ ...base, assessment: { verdict: 'junk', clear: true, evidence: 'synthetic words', summary: null } })).toBe('junk');
    expect(voicemailVerdict({ ...base, transcript: ' ', duration: VOICEMAIL_LIMITS.silentMaxSeconds })).toBe('junk');
    expect(voicemailVerdict({ ...base, transcript: '', duration: VOICEMAIL_LIMITS.silentMaxSeconds + 1 })).toBe('keep');
  });
});
