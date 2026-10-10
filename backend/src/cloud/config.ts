import { z } from 'zod';
import { modelConfigFields } from '../model-config.js';

export const cloudSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().default('shield-calls-isaac'),
  FIREBASE_WEB_API_KEY: z.string().min(1),
  IOS_BUNDLE_ID: z.string().default('org.isaaczhang.Shield'),
  PUBLIC_BASE_URL: z.literal('https://shield-calls-isaac.web.app'),
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-f0-9]{32}$/i),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TRIAL_PROXY_SECRET: z.string().regex(/^[a-f0-9]{64}$/),
  TRIAL_TWILIO_NUMBER: z.string().regex(/^\+1\d{10}$/),
  TRIAL_VERIFIED_CALLER: z.string().regex(/^\+1\d{10}$/),
  TRIAL_PARTICIPANT_ID: z.string().uuid(),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  FORWARDING_PROVIDER: z.enum(['twilio', 'telnyx']).default('twilio'),
  TELNYX_ACCOUNT_ID: z.string().uuid().optional(),
  TELNYX_API_KEY: z.string().min(16).optional(),
  TELNYX_PUBLIC_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).optional(),
  TELNYX_APPLICATION_ID: z.string().regex(/^\d{6,30}$/).optional(),
  TELNYX_NUMBER: z.string().regex(/^\+1\d{10}$/).optional(),
  TELNYX_RECORDING_HOSTS: z.array(z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/)).default([]),
  LIVE_SCREENING_ENABLED: z.boolean().default(false),
  LIVE_BRIDGE_URL: z.string().regex(/^https:\/\/[a-z0-9-]+\.a\.run\.app$/).optional(),
  // Connected-call protection is offered only when this is on AND the recipient opts in (Telnyx only).
  CALL_MONITORING_ENABLED: z.boolean().default(false),
  MONITOR_TRANSCRIPTION_ENGINE: z.enum(['Parakeet', 'Soniox', 'Deepgram']).default('Parakeet'),
  ...modelConfigFields
}).superRefine((c, ctx) => {
  if (c.FORWARDING_PROVIDER === 'telnyx') {
    for (const key of ['TELNYX_ACCOUNT_ID', 'TELNYX_API_KEY', 'TELNYX_PUBLIC_KEY', 'TELNYX_APPLICATION_ID', 'TELNYX_NUMBER'] as const) {
      if (!c[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Required for Telnyx forwarding' });
    }
  }
});
export type CloudConfig = z.infer<typeof cloudSchema>;
export const CONSENT_VERSION = 'shield-pilot-2026-09-v1';
export const RETENTION_MS = 30 * 86400_000;
