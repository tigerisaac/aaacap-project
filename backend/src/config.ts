import { z } from 'zod';
import { modelConfigFields, modelConfigured } from './model-config.js';

const flag = z.enum(['true', 'false']).default('false').transform(v => v === 'true');
const optional = z.string().default('');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SHIELD_MODE: z.enum(['demo', 'live']).default('demo'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  PUBLIC_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  DATABASE_URL: optional,
  EMBEDDED_DB_PATH: z.string().default('.data/shield'),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i, 'Use a random 32-byte hex encryption key.'),
  DEMO_ACCESS_TOKEN: optional,
  TWILIO_ACCOUNT_SID: optional,
  TWILIO_AUTH_TOKEN: optional,
  AUTH_PROVIDER: z.enum(['firebase', 'supabase']).default('firebase'),
  FIREBASE_PROJECT_ID: z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/).or(z.literal('')).default(''),
  FIREBASE_WEB_API_KEY: optional,
  SUPABASE_URL: optional,
  SUPABASE_PUBLISHABLE_KEY: optional,
  ...modelConfigFields,
  LIVE_OFFERING_ENABLED: flag,
  SMS_CLASSIFICATION_ENABLED: flag,
  CALLBACK_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(25).default(15),
  MAX_BRIDGE_SECONDS: z.coerce.number().int().min(60).max(3600).default(1200),
  MAX_VOICEMAIL_SECONDS: z.coerce.number().int().min(10).max(180).default(120),
  MAX_CALLBACKS_PER_PARTICIPANT_DAY: z.coerce.number().int().min(1).max(100).default(10),
  MAX_CALLBACKS_PER_DAY: z.coerce.number().int().min(1).max(10000).default(100),
  MAX_SCREENINGS_PER_PARTICIPANT_DAY: z.coerce.number().int().min(1).max(500).default(40),
  MAX_CLASSIFICATIONS_PER_DAY: z.coerce.number().int().min(1).max(100000).default(500),
  RETENTION_DAYS: z.coerce.number().int().min(1).max(30).default(30),
  APPLE_TEAM_ID: optional,
  IOS_BUNDLE_ID: z.string().default('org.isaaczhang.Shield'),
  APNS_KEY_ID: optional,
  APNS_TEAM_ID: optional,
  APNS_PRIVATE_KEY: optional,
  APNS_PRODUCTION: flag,
  SUPPORT_EMAIL: optional
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = schema.parse(env);
  const url = new URL(config.PUBLIC_BASE_URL);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('PUBLIC_BASE_URL must be a bare origin, without a path, credentials, or query.');
  }
  config.PUBLIC_BASE_URL = url.origin;
  if (config.SHIELD_MODE === 'demo') {
    if (config.NODE_ENV === 'production' || !['127.0.0.1', 'localhost', '::1'].includes(config.HOST)
      || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      throw new Error('Demo mode is restricted to a local, non-production server.');
    }
    if (config.DEMO_ACCESS_TOKEN.length < 32) throw new Error('A random demo token of at least 32 characters is required.');
    if (config.LIVE_OFFERING_ENABLED || config.SMS_CLASSIFICATION_ENABLED) {
      throw new Error('Live service switches cannot be enabled in demo mode.');
    }
  } else {
    for (const field of ['DATABASE_URL', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'] as const) {
      if (!config[field]) throw new Error(`Live mode requires ${field}.`);
    }
    if (url.protocol !== 'https:') throw new Error('Live webhooks require HTTPS.');
    if (!/^AC[a-f0-9]{32}$/i.test(config.TWILIO_ACCOUNT_SID)) throw new Error('Invalid Twilio account SID.');
    if (config.AUTH_PROVIDER === 'firebase') {
      if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_WEB_API_KEY) throw new Error('Firebase authentication requires its project ID and web API key.');
      if (env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Live mode cannot use the Firebase Auth emulator.');
    } else if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY || new URL(config.SUPABASE_URL).protocol !== 'https:') {
      throw new Error('Supabase authentication requires an HTTPS project URL and publishable key.');
    }
    if ((config.LIVE_OFFERING_ENABLED || config.SMS_CLASSIFICATION_ENABLED) && !modelConfigured(config)) {
      throw new Error('Live classification requires an API key and an explicitly selected/evaluated model.');
    }
  }
  return config;
}
