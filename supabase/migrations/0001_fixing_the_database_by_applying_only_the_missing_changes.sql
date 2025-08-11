-- Create the table for Telegram users if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on the users table (this is idempotent)
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Recreate the access policy to ensure it's correctly set up
DROP POLICY IF EXISTS "Allow service-role access" ON public.telegram_users;
CREATE POLICY "Allow service-role access"
  ON public.telegram_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add the necessary columns to the orders table if they don't already exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Новая заявка',
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT;

-- Set the starting number for order IDs (this is idempotent)
ALTER SEQUENCE public.order_public_id_seq RESTART WITH 583;