import { z } from 'zod';

export const cloudSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().default('shield-calls-isaac'),
  FIREBASE_WEB_API_KEY: z.string().min(1),
  IOS_BUNDLE_ID: z.string().default('org.isaaczhang.Shield'),
  PUBLIC_BASE_URL: z.literal('https://shield-calls-isaac.web.app'),
  TRIAL_PROXY_SECRET: z.string().regex(/^[a-f0-9]{64}$/),
  TRIAL_VERIFIED_CALLER: z.string().regex(/^\+1\d{10}$/),
  TRIAL_PARTICIPANT_ID: z.string().uuid(),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  TELNYX_ACCOUNT_ID: z.string().uuid(),
  TELNYX_API_KEY: z.string().min(16),
  TELNYX_PUBLIC_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  TELNYX_APPLICATION_ID: z.string().regex(/^\d{6,30}$/),
  TELNYX_NUMBER: z.string().regex(/^\+1\d{10}$/),
  TELNYX_RECORDING_HOSTS: z.array(z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/)).default([]),
  LIVE_SCREENING_ENABLED: z.boolean().default(false),
  LIVE_BRIDGE_URL: z.string().regex(/^https:\/\/[a-z0-9-]+\.a\.run\.app$/).optional(),
  // Connected-call protection is offered only when this is on AND the recipient opts in.
  CALL_MONITORING_ENABLED: z.boolean().default(false),
  MONITOR_TRANSCRIPTION_ENGINE: z.enum(['Parakeet', 'Soniox', 'Deepgram']).default('Soniox'),
  // Push alerts are offered only when an APNs auth key (.p8) from the Apple Developer account is configured.
  APNS: z.object({ keyId: z.string().regex(/^[A-Z0-9]{10}$/), teamId: z.string().regex(/^[A-Z0-9]{10}$/),
    privateKey: z.string().includes('PRIVATE KEY') }).strict().optional(),
});
export type CloudConfig = z.infer<typeof cloudSchema>;
export const CONSENT_VERSION = 'shield-pilot-2026-09-v1';
export const RETENTION_MS = 30 * 86400_000;
