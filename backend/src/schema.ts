export const migration = `
CREATE TABLE IF NOT EXISTS schema_versions (version integer PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS carrier_profiles (
  id text PRIMARY KEY, name text NOT NULL, configuration text NOT NULL,
  activation_steps jsonb NOT NULL DEFAULT '[]', restoration_steps jsonb NOT NULL DEFAULT '[]',
  validated_at timestamptz, evidence_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY, auth_subject text UNIQUE NOT NULL, name_enc text NOT NULL,
  phone_enc text NOT NULL, phone_hash text NOT NULL UNIQUE, did text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','active','paused','restoring','offboarded')),
  phone_verified_at timestamptz, consent_version text, consented_at timestamptz,
  carrier_profile_id text REFERENCES carrier_profiles(id), last_routing_test_at timestamptz,
  routing_evidence text, active_call_id uuid, guard_until timestamptz,
  restoration_requested_at timestamptz, restored_at timestamptz,
  deletion_requested_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS trusted_numbers (
  id uuid PRIMARY KEY, participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  label_enc text NOT NULL, phone_enc text NOT NULL, phone_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(participant_id,phone_hash)
);
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY, participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  label_enc text NOT NULL, phone_enc text NOT NULL, provenance text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY, participant_id uuid NOT NULL REFERENCES participants(id),
  original_sid text NOT NULL UNIQUE, child_sid text UNIQUE, caller_enc text NOT NULL,
  state text NOT NULL CHECK (state IN ('screening','evaluating','offering','accepting','accepted','voicemail','ended')),
  outcome text NOT NULL DEFAULT 'screening', reason text NOT NULL DEFAULT 'screening', purpose text,
  callback_attempted boolean NOT NULL DEFAULT false, child_terminal boolean NOT NULL DEFAULT false,
  accepted_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  deadline timestamptz NOT NULL, expires_at timestamptz NOT NULL,
  model_version text, policy_version text NOT NULL DEFAULT 'shield-policy-1',
  last_sequence integer NOT NULL DEFAULT -1
);
CREATE INDEX IF NOT EXISTS calls_participant_date ON call_sessions(participant_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS calls_deadline ON call_sessions(deadline) WHERE state <> 'ended';
CREATE TABLE IF NOT EXISTS call_events (
  id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  kind text NOT NULL, happened_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id,kind)
);
CREATE TABLE IF NOT EXISTS voicemails (
  id uuid PRIMARY KEY, participant_id uuid NOT NULL REFERENCES participants(id),
  session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  recording_sid text NOT NULL UNIQUE, duration integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','failed','deleting')),
  audio_enc text, heard_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY, kind text NOT NULL, dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_due ON jobs(available_at) WHERE status IN ('pending','running');
CREATE TABLE IF NOT EXISTS daily_usage (
  key text NOT NULL, day date NOT NULL DEFAULT CURRENT_DATE, used integer NOT NULL DEFAULT 0,
  PRIMARY KEY(key,day)
);
CREATE TABLE IF NOT EXISTS push_devices (
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  auth_subject text NOT NULL, token_enc text NOT NULL, token_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(participant_id,token_hash)
);
CREATE TABLE IF NOT EXISTS caregiver_grants (
  id uuid PRIMARY KEY, participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, grantee_subject text, label_enc text NOT NULL,
  can_listen boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL,
  accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS grant_person_subject ON caregiver_grants(participant_id,grantee_subject) WHERE revoked_at IS NULL AND grantee_subject IS NOT NULL;
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY, participant_id uuid REFERENCES participants(id),
  kind text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_settings (
  key text PRIMARY KEY, value jsonb NOT NULL
);
INSERT INTO service_settings(key,value) VALUES ('offers_paused','false') ON CONFLICT DO NOTHING;
INSERT INTO schema_versions(version) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS routing_test_until timestamptz;
INSERT INTO schema_versions(version) VALUES (2) ON CONFLICT DO NOTHING;
`;
