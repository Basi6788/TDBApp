-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create users table for credits and referrals
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    credits INTEGER NOT NULL DEFAULT 10,
    referral_code TEXT UNIQUE NOT NULL DEFAULT SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
    referred_by TEXT,
    active_key_id UUID,
    key_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create super_keys table for admin generated keys
CREATE TABLE public.super_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT UNIQUE NOT NULL,
    credits_amount INTEGER NOT NULL DEFAULT 1000,
    validity_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_by_device_id TEXT,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create site_settings table for admin customization
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create referral_logs table
CREATE TABLE public.referral_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_device_id TEXT NOT NULL,
    referred_device_id TEXT NOT NULL,
    credits_awarded INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create ad_watch_logs table
CREATE TABLE public.ad_watch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    credits_earned INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
    ('api_url', 'https://cnic-db.technoluxs.uk/api/data'),
    ('admin_password', 'uchihalegacy'),
    ('credits_per_search', '1'),
    ('credits_per_ad', '1'),
    ('credits_per_referral', '5'),
    ('initial_credits', '10');

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_watch_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if device is admin (has active super key)
CREATE OR REPLACE FUNCTION public.is_admin_device(check_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE device_id = check_device_id
        AND active_key_id IS NOT NULL
        AND (key_expires_at IS NULL OR key_expires_at > NOW())
    )
$$;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (true);

-- RLS Policies for super_keys table (admin only for management)
CREATE POLICY "Anyone can view active keys" ON public.super_keys
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert keys" ON public.super_keys
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update keys" ON public.super_keys
    FOR UPDATE USING (true);

-- RLS Policies for site_settings
CREATE POLICY "Anyone can view settings" ON public.site_settings
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update settings" ON public.site_settings
    FOR UPDATE USING (true);

-- RLS Policies for referral_logs
CREATE POLICY "Anyone can view referral logs" ON public.referral_logs
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert referral logs" ON public.referral_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for ad_watch_logs
CREATE POLICY "Anyone can view ad logs" ON public.ad_watch_logs
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert ad logs" ON public.ad_watch_logs
    FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();