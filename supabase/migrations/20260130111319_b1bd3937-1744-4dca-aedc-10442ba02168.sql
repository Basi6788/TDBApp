-- Update referral_logs to include clerk_user_id for better tracking
ALTER TABLE public.referral_logs 
  ADD COLUMN IF NOT EXISTS referrer_clerk_user_id text,
  ADD COLUMN IF NOT EXISTS referred_clerk_user_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_logs_referrer_clerk_user_id ON public.referral_logs(referrer_clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_referred_clerk_user_id ON public.referral_logs(referred_clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_created_at ON public.referral_logs(created_at DESC);