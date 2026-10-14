import { permittedDecision, callerText } from '../../dist/live/policy.js';
import { researchSchema } from '../../dist/live/research.js';
import { screeningCheck } from './screening-target.mjs';

// The same tool-result instructions used by ScreeningSession. Bounded protocol
// repair is not a new policy or permission to apply an invalid decision.
const continuation = { status: 'continue_screening', instruction: 'Ask one brief clarifying question about only the missing information. Do not announce connection or rejection.' };
export async function initialAssessment({ transcript, respond, research, diagnose = () => {} }) {
  const input = [screeningCheck(transcript)];
  let researched = false;
  for (let round = 0; round < 3; round++) {
    const response = await respond(input, 'required', 'initial');
    if (response.status !== 'completed') throw new Error('initial_incomplete');
    input.push(...response.output);
    const calls = response.output.filter(i => i.type === 'function_call');
    if (calls.length !== 1) throw new Error('initial_tool_count');
    const call = calls[0];
    let value; try { value = JSON.parse(call.arguments); } catch { value = null; }
    if (call.name === 'research_scam_pattern') {
      const parsed = researchSchema.safeParse(value);
      const output = !researched && parsed.success ? await research(parsed.data.topic) : { status: 'unavailable' };
      researched = true; input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) });
      continue;
    }
    const decision = call.name === 'screen_call' ? permittedDecision(value, transcript) : undefined;
    if (decision) {
      if (decision.action === 'continue') input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(continuation) });
      return { decision, input };
    }
    diagnose('initial_decision_rejected', { round: round + 1,
      tool: call.name === 'screen_call' ? 'screen_call' : 'unsupported',
      action: ['approve', 'block', 'hold', 'message', 'continue'].includes(value?.action) ? value.action : 'invalid' });
    input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({
      status: 'decision_not_applied', untrustedCallerTranscript: callerText(transcript),
      instruction: "Evidence must be the caller's own words from this transcript, and approval needs who is calling and why. Call screen_call again with corrected fields, or continue only if information is genuinely missing. Do not announce connection or rejection."
    }) });
  }
  throw new Error('initial_repair_limit');
}

export function clarificationQuestion(decision) {
  // Rendering a validated continue does not require another classification or
  // model round trip. These are the policy's three general clarification needs.
  if (decision?.action !== 'continue' || typeof decision.hasName !== 'boolean'
    || typeof decision.hasReason !== 'boolean') throw new Error('question_invalid');
  if (!decision.hasName) return "Who's calling, please?";
  if (!decision.hasReason) return "What can I tell them it's about?";
  return 'What do you need them to do?';
}
