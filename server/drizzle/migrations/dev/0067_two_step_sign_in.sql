-- Two-step sign-in (TOTP + emailed codes) and email ownership verification.

ALTER TABLE user ADD COLUMN email_verified_at text;

CREATE TABLE user_mfa (
  user_id text PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  totp_secret_enc text,
  totp_confirmed_at text,
  totp_last_step integer,
  email_otp_enabled integer DEFAULT 0 NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE mfa_recovery_code (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at text,
  created_at text NOT NULL
);
CREATE INDEX idx_mfa_recovery_code_user_id ON mfa_recovery_code(user_id);

CREATE TABLE mfa_challenge (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  expires_at text NOT NULL,
  consumed_at text,
  created_at text NOT NULL
);
CREATE INDEX idx_mfa_challenge_user_purpose ON mfa_challenge(user_id, purpose);
