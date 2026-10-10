import { describe, it, expect, vi } from 'vitest';
import { researchScamPattern, researchRequest, readResearchResponse, researchSchema, RESEARCH_TIMEOUT_MS, RESEARCH_DOMAINS } from '../src/live/research.js';
const body = (url = 'https://www.uscourts.gov/court-programs/jury-service/juror-scams') => ({ status: 'completed', output: [
  { type: 'web_search_call', status: 'completed' },
  { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Public court guidance; this does not verify a caller.', annotations: [{ type: 'url_citation', url }] }] }
] });
describe('bounded public scam research', () => {
  it('uses fixed topic text, domain filters and one search without stored responses', () => {
    const request = researchRequest('government_impersonation');
    expect(request).toMatchObject({ model: 'gpt-6-luna', store: false, max_tool_calls: 1, tools: [{ type: 'web_search', filters: { allowed_domains: [...RESEARCH_DOMAINS] } }] });
    expect(researchSchema.safeParse({ topic: 'government_impersonation', transcript: 'caller data' }).success).toBe(false);
  });
  it('requires completed web evidence and an allowed citation', () => {
    expect(readResearchResponse(body()).status).toBe('found');
    for (const url of ['https://uscourts.gov.evil.example/scam', 'http://uscourts.gov/scam', 'https://evil.example', 'https://user:password@ftc.gov/']) {
      expect(readResearchResponse(body(url))).toEqual({ status: 'unavailable' });
    }
    expect(readResearchResponse({ ...body(), status: 'incomplete' }).status).toBe('unavailable');
    expect(readResearchResponse({ ...body(), output: body().output.slice(1) }).status).toBe('unavailable');
  });
  it('fails without exposing transport errors or response contents', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('sensitive transport content'));
    expect(await researchScamPattern('financial_impersonation', 'test-key', fetcher)).toEqual({ status: 'unavailable' });
  });
  it('aborts a stalled request at the deadline even if the transport ignores abort', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(() => new Promise<Response>(() => {}));
      const result = researchScamPattern('government_impersonation', 'test-key', fetcher);
      await vi.advanceTimersByTimeAsync(RESEARCH_TIMEOUT_MS);
      expect(await result).toEqual({ status: 'unavailable' });
      expect((fetcher.mock.calls[0] as any)[1].signal.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it('returns bounded source-backed results and sends no caller context', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body()), { status: 200 }));
    expect((await researchScamPattern('government_impersonation', 'test-key', fetcher)).status).toBe('found');
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(JSON.parse(init.body)).toEqual(researchRequest('government_impersonation'));
    expect(init.redirect).toBe('error');
  });
});
