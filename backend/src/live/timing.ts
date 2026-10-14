/** Timing only: no event bodies, model arguments, transcript, audio, URLs or provider IDs. */
export const TIMING_PHASES = [
  'hybrid_stt_started', 'hybrid_stt_ready', 'hybrid_transcript', 'hybrid_check_started', 'hybrid_check_rejected', 'hybrid_handoff',
  'bridge_claimed', 'provider_started', 'model_socket_open', 'session_start_sent', 'model_ready',
  'first_audio_received', 'caller_speech_started', 'caller_speech_paused', 'first_transcript',
  'delegation_created', 'response_started', 'response_completed', 'response_usage', 'first_tool_output', 'decision_received',
  'decision_rejected', 'decision_deferred', 'decision_superseded', 'decision_applied',
  'transcript_changed', 'clarification_requested', 'response_resume_sent', 'screening_check_sent',
  'research_started', 'research_finished', 'assistant_audio_received', 'assistant_audio_sent',
  'terminal_decision', 'provider_ended', 'outcome_saved', 'redirect_started', 'redirect_finished',
  'hangup_started', 'hangup_finished', 'handoff_failed', 'handoff_finished', 'transport_closed',
  'acknowledgement_started', 'acknowledgement_finished', 'acknowledgement_interrupted'
] as const;
export type TimingPhase = typeof TIMING_PHASES[number];
export type TimingMetrics = Partial<Record<
  'sessionMs' | 'processAgeMs' | 'firstCallInProcess' | 'claimMs' | 'response' | 'responseMs' |
  'sinceCallerAudioMs' | 'sinceCallerTranscriptMs' | 'sinceAssistantAudioMs' | 'bufferedAudioMs' |
  'sinceClarificationMs' | 'researchMs' | 'deferredMs' | 'saveMs' | 'redirectMs' | 'handoffMs' |
  'attempt' | 'successful' | 'transcriptChanged' | 'backendBusy' | 'inputTokens' | 'cachedInputTokens' |
  'cacheWriteTokens' | 'outputTokens' | 'reasoningTokens' | 'priorityTier' | 'initialAssessment' | 'hybridChecks', number | boolean>>;
export type TimingSink = (phase: TimingPhase, metrics: TimingMetrics) => void;

export const TIMING_METRICS = [
  'initialAssessment', 'hybridChecks',
  'sessionMs', 'processAgeMs', 'firstCallInProcess', 'claimMs', 'response', 'responseMs',
  'sinceCallerAudioMs', 'sinceCallerTranscriptMs', 'sinceAssistantAudioMs', 'bufferedAudioMs',
  'sinceClarificationMs', 'researchMs', 'deferredMs', 'saveMs', 'redirectMs', 'handoffMs',
  'attempt', 'successful', 'transcriptChanged', 'backendBusy', 'inputTokens', 'cachedInputTokens',
  'cacheWriteTokens', 'outputTokens', 'reasoningTokens', 'priorityTier'
] as const;
const metricNames = new Set<string>(TIMING_METRICS);
const finalPhases = new Set<TimingPhase>(['terminal_decision', 'provider_ended', 'outcome_saved',
  'redirect_started', 'redirect_finished', 'hangup_started', 'hangup_finished', 'handoff_failed',
  'handoff_finished', 'transport_closed', 'response_usage']);

/** Read only documented usage counters; never serialize the response or its reasoning. */
export function responseUsage(response: any): TimingMetrics {
  const usage = response?.usage;
  return {
    inputTokens: usage?.input_tokens, cachedInputTokens: usage?.input_tokens_details?.cached_tokens,
    cacheWriteTokens: usage?.input_tokens_details?.cache_write_tokens, outputTokens: usage?.output_tokens,
    reasoningTokens: usage?.output_tokens_details?.reasoning_tokens,
    ...(['default', 'fast', 'priority'].includes(response?.service_tier)
      ? { priorityTier: response.service_tier !== 'default' } : {})
  };
}

/** Bound volume and isolate diagnostics failures from call control. */
export function callTiming(callId: string, createdAt: number, now = Date.now,
  write: (entry: object) => void = entry => console.info(JSON.stringify(entry))): TimingSink {
  let entries = 0;
  return (phase, metrics) => {
    if (!TIMING_PHASES.includes(phase) || (!finalPhases.has(phase) && entries++ >= 240)) return;
    const safe = Object.fromEntries(Object.entries(metrics).filter(([key, value]) => metricNames.has(key)
      && (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value) && value >= 0))));
    try { write({ event: 'live_timing', callId, phase, elapsedMs: Math.max(0, now() - createdAt), ...safe }); }
    catch { /* Logging never changes a call's outcome. */ }
  };
}
