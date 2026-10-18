import { ZodError } from 'zod';
import { HttpError } from '../auth.js';

type APIFailureStage = 'api_initialization' | 'api_dispatch' | 'api_request';
const knownFailures = new Set([
  'call_busy', 'call_start_pending', 'phone_verification_unavailable', 'sign_in_unavailable',
  'subscription_verification_unavailable', 'subscription_cleanup_unavailable', 'account_deletion_unavailable',
  'recording_unavailable', 'recording_deletion_incomplete', 'command_outcome_uncertain',
  'unexpected_auth_emulator', 'service_unavailable'
]);

function category(error: unknown, stage: APIFailureStage): string {
  if (error instanceof ZodError) return stage === 'api_initialization' ? 'runtime_configuration_invalid' : 'validation_failure';
  if (error instanceof HttpError && knownFailures.has(error.code)) return error.code;
  if (error instanceof Error && knownFailures.has(error.message)) return error.message;
  if (error instanceof Error && /^telnyx_http_[45]\d{2}$/.test(error.message)) return 'telephony_request_failed';
  if (error instanceof SyntaxError) return 'parse_failure';
  if (error instanceof TypeError) return 'type_error';
  return 'unexpected_failure';
}

/** Fixed categories only: never serialize an error, request, identity, URL or stack. */
export function reportAPIFailure(stage: APIFailureStage, error: unknown, status: number): void {
  if (!Number.isInteger(status) || status < 500 || status > 599) return;
  try {
    const failure = category(error, stage);
    console.error(JSON.stringify({ severity: failure === 'call_busy' ? 'WARNING' : 'ERROR',
      event: 'shield_api_failure', stage, status, category: failure }));
  } catch {
    // Diagnostics must never change a response or interfere with carrier retries.
  }
}
