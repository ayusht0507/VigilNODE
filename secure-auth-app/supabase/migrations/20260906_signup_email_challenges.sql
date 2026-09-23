-- Migration: 20260906_signup_email_challenges.sql
-- Description: Server-only 6-digit email OTP challenges table for signup verification

BEGIN;

CREATE TABLE IF NOT EXISTS public.signup_email_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  otp_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0
    CHECK (attempts >= 0 AND attempts <= 5),
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS signup_email_challenges_user_id_idx
  ON public.signup_email_challenges (user_id);

CREATE INDEX IF NOT EXISTS signup_email_challenges_email_idx
  ON public.signup_email_challenges (email);

CREATE INDEX IF NOT EXISTS signup_email_challenges_expires_at_idx
  ON public.signup_email_challenges (expires_at);

-- Enable RLS
ALTER TABLE public.signup_email_challenges ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from public, anon, and authenticated roles
-- Only the service_role key can access this table
REVOKE ALL ON public.signup_email_challenges FROM public, anon, authenticated;

COMMIT;
