import { z } from 'zod';

// Telnyx Verify returns hex GUIDs without RFC UUID version/variant bits.
export const telnyxVerifyIDSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const cloudSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().default('shield-calls-isaac'),
  FIREBASE_WEB_API_KEY: z.string().min(1),
  IOS_BUNDLE_ID: z.string().default('org.isaaczhang.Shield'),
  PUBLIC_BASE_URL: z.literal('https://shield-calls-isaac.web.app'),
  TRIAL_PROXY_SECRET: z.string().regex(/^[a-f0-9]{64}$/),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  TELNYX_ACCOUNT_ID: z.string().uuid(),
  TELNYX_API_KEY: z.string().min(16),
  // Absent until the owner configures verification and an approved messaging sender.
  TELNYX_VERIFY_PROFILE_ID: telnyxVerifyIDSchema.optional(),
  SMS_ALERTS: z.object({ messagingProfileId: z.string().uuid(), from: z.string().regex(/^\+1[2-9]\d{9}$/) }).strict().optional(),
  TELNYX_PUBLIC_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  TELNYX_APPLICATION_ID: z.string().regex(/^\d{6,30}$/),
  SHARED_NUMBER_ENABLED: z.boolean().default(false),
  TELNYX_SHARED_APPLICATION_ID: z.string().regex(/^\d{6,30}$/).optional(),
  TELNYX_NUMBER: z.string().regex(/^\+1[2-9]\d{9}$/).default('+15074731802'),
  // Each person's Shield number and verified phone live in Firestore (shieldNumbers, participants), not here.
  TELNYX_RECORDING_HOSTS: z.array(z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/)).default([]),
  LIVE_SCREENING_ENABLED: z.boolean().default(false),
  LIVE_BRIDGE_URL: z.string().regex(/^https:\/\/[a-z0-9-]+\.a\.run\.app$/).optional(),
  // Connected-call protection is offered only when this is on AND the recipient opts in.
  CALL_MONITORING_ENABLED: z.boolean().default(false),
  MONITOR_TRANSCRIPTION_ENGINE: z.enum(['Parakeet', 'Soniox', 'Deepgram']).default('Soniox'),
  // A second Telnyx number, never in anyone's contacts, that places the daily setup check. Unset: no checks.
  SETUP_CHECK_NUMBER: z.string().regex(/^\+1[2-9]\d{9}$/).optional(),
  // Legacy runtime compatibility. Every saved message is now transcribed, checked and summarized.
  VOICEMAIL_SCREENING_ENABLED: z.boolean().default(false),
  // Push alerts are offered only when an APNs auth key (.p8) from the Apple Developer account is configured.
  APNS: z.object({ keyId: z.string().regex(/^[A-Z0-9]{10}$/), teamId: z.string().regex(/^[A-Z0-9]{10}$/),
    privateKey: z.string().includes('PRIVATE KEY') }).strict().optional(),
  // Secret credentials stay in SHIELD_RUNTIME. Only applePublicKey goes to the signed-in iOS app.
  // Purchase availability additionally requires an operator-verified phone setup for this account.
  REVENUECAT: z.object({
    applePublicKey: z.string().regex(/^appl_[A-Za-z0-9]+$/),
    secretApiKey: z.string().min(20).max(512),
    webhookAuthorization: z.string().min(32).max(512),
    entitlementId: z.string().min(1).max(100).default('shield_access'),
    offeringId: z.string().min(1).max(100).default('default'),
    monthlyProductId: z.string().min(1).max(200).default('shield_monthly'),
    annualProductId: z.string().min(1).max(200).default('shield_annual'),
    purchasesEnabled: z.boolean().default(false),
  }).strict().refine(value => value.monthlyProductId !== value.annualProductId, 'Distinct subscription products required').optional(),
});
export type CloudConfig = z.infer<typeof cloudSchema>;
export const CONSENT_VERSION = 'shield-2026-10-16-privacy-v2';
export const RETENTION_MS = 30 * 86400_000;
