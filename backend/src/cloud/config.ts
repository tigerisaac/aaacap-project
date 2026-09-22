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
  ...modelConfigFields
});
export type CloudConfig = z.infer<typeof cloudSchema>;
export const CONSENT_VERSION = 'shield-pilot-2026-09-v1';
export const RETENTION_MS = 30 * 86400_000;
