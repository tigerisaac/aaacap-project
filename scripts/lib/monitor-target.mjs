// Production monitoring request and intervention validation, shared by text evaluations.
import { randomUUID } from 'node:crypto';
import { monitorRequest, warrantsIntervention, assessmentSchema, MONITOR_POLICY_VERSION, MONITOR_LIMITS } from '../../dist/cloud/monitoring.js';
import { PROVIDERS, providerKey } from './screening-target.mjs';

export async function monitorTarget(provider = 'go') {
  if (!PROVIDERS[provider]) throw new Error('unknown_provider');
  const key = await providerKey(provider);
  const sample = monitorRequest('');
  async function assess(transcript) {
    // The application keeps a rolling tail, not unlimited conversation history.
    transcript = transcript.slice(-MONITOR_LIMITS.keepChars);
    const body = monitorRequest(transcript);
    // Go chooses its own processing tier. Prompt, model and medium reasoning are unchanged.
    if (provider === 'go') delete body.service_tier;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
      let r;
      try {
        r = await fetch(PROVIDERS[provider].url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': 'shield-screening-check/1.0',
            ...(provider === 'go' ? { 'x-opencode-session': randomUUID() } : {}) }, body: JSON.stringify(body) });
      } catch { return { actual: 'failure', failure: 'transport_unavailable' }; }
      if (r.status === 429 || r.status >= 500) continue;
      if (!r.ok) return { actual: 'failure', failure: `http_${r.status}` };
      try {
        const response = await r.json();
        if (response.status !== 'completed') return { actual: 'failure', failure: 'response_incomplete' };
        const call = response.output?.find(i => i.type === 'function_call' && i.name === 'assess_call');
        const parsed = assessmentSchema.safeParse(JSON.parse(call?.arguments ?? 'null'));
        if (!parsed.success) return { actual: 'failure', failure: 'invalid_assessment' };
        const assessment = parsed.data;
        const warranted = warrantsIntervention(assessment, transcript);
        if (assessment.action === 'intervene' && !warranted) return { actual: 'failure', failure: 'unsupported_intervention', assessment };
        return { actual: warranted ? 'intervene' : 'continue', assessment };
      } catch { return { actual: 'failure', failure: 'invalid_assessment' }; }
    }
    return { actual: 'failure', failure: 'unavailable' };
  }
  return { model: sample.model, effort: sample.reasoning.effort, policyVersion: MONITOR_POLICY_VERSION, contextChars: MONITOR_LIMITS.keepChars, assess };
}
