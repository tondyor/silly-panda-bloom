-- Create telegram_users table with extended fields
CREATE TABLE public.telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  language_code TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_deals_count INTEGER DEFAULT 0,
  total_volume_vnd NUMERIC DEFAULT 0,
  total_volume_usdt NUMERIC DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to select their own data
CREATE POLICY "Users can select their own data" ON public.telegram_users
  FOR SELECT TO authenticated USING ((telegram_id)::text = current_setting('request.jwt.claim.sub'));

-- Policies for authenticated users to insert their own data
CREATE POLICY "Users can insert their own data" ON public.telegram_users
  FOR INSERT TO authenticated WITH CHECK ((telegram_id)::text = current_setting('request.jwt.claim.sub'));

-- Policies for authenticated users to update their own data
CREATE POLICY "Users can update their own data" ON public.telegram_users
  FOR UPDATE TO authenticated USING ((telegram_id)::text = current_setting('request.jwt.claim.sub'));

-- Policies for authenticated users to delete their own data
CREATE POLICY "Users can delete their own data" ON public.telegram_users
  FOR DELETE TO authenticated USING ((telegram_id)::text = current_setting('request.jwt.claim.sub'));