-- Add clerk_user_id to users table to link credits with authenticated users
ALTER TABLE public.users 
ADD COLUMN clerk_user_id text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_users_clerk_user_id ON public.users(clerk_user_id);