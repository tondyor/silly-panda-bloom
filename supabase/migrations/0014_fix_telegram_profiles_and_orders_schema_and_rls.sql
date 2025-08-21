-- Drop existing triggers and policies related to telegram_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP POLICY IF EXISTS "Users can view their own telegram profile" ON public.telegram_profiles;
DROP POLICY IF EXISTS "Users can insert their own telegram profile" ON public.telegram_profiles;
DROP POLICY IF EXISTS "Users can update their own telegram profile" ON public.telegram_profiles;
DROP POLICY IF EXISTS "Users can delete their own telegram profile" ON public.telegram_profiles;

-- Drop the table if it exists
DROP TABLE IF EXISTS public.telegram_profiles CASCADE;

-- Recreate telegram_profiles table with telegram_id as primary key and nullable id (UUID)
CREATE TABLE public.telegram_profiles (
  telegram_id BIGINT PRIMARY KEY, -- Telegram user ID as primary key
  id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional link to Supabase auth.users
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  language_code TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.telegram_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for telegram_profiles
-- Users can view their own telegram profile (if linked to auth.users OR by telegram_id if authenticated via Telegram WebApp)
CREATE POLICY "Users can view their own telegram profile" ON public.telegram_profiles
FOR SELECT TO authenticated USING (
    (auth.uid() = id) OR (telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
);

-- Users can insert their own telegram profile (if linked to auth.users OR by telegram_id)
CREATE POLICY "Users can insert their own telegram profile" ON public.telegram_profiles
FOR INSERT TO authenticated WITH CHECK (
    (auth.uid() = id) OR (telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
);

-- Users can update their own telegram profile (if linked to auth.users OR by telegram_id)
CREATE POLICY "Users can update their own telegram profile" ON public.telegram_profiles
FOR UPDATE TO authenticated USING (
    (auth.uid() = id) OR (telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
);

-- Users can delete their own telegram profile (if linked to auth.users OR by telegram_id)
CREATE POLICY "Users can delete their own telegram profile" ON public.telegram_profiles
FOR DELETE TO authenticated USING (
    (auth.uid() = id) OR (telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
);

-- Recreate handle_new_user function and trigger to update telegram_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.telegram_profiles (id, telegram_id, first_name, last_name, username, language_code)
  VALUES (
    new.id,
    (new.raw_user_meta_data ->> 'telegram_id')::BIGINT,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'language_code'
  )
  ON CONFLICT (telegram_id) DO UPDATE SET
    id = EXCLUDED.id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    username = EXCLUDED.username,
    language_code = EXCLUDED.language_code,
    updated_at = NOW();
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at column on telegram_profiles
DROP TRIGGER IF EXISTS trg_telegram_profiles_updated_at ON public.telegram_profiles;
CREATE TRIGGER trg_telegram_profiles_updated_at
BEFORE UPDATE ON public.telegram_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add public_id column to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='public_id') THEN
        ALTER TABLE public.orders ADD COLUMN public_id TEXT UNIQUE;
    END IF;
END
$$;

-- Update existing orders to generate public_id for rows where it's null
UPDATE public.orders
SET public_id = 'ORD-' || LPAD(order_id::TEXT, 10, '0')
WHERE public_id IS NULL;

-- Ensure public_id is NOT NULL after initial population
ALTER TABLE public.orders ALTER COLUMN public_id SET NOT NULL;

-- Update RLS policies for orders to use telegram_id as the primary link
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.telegram_profiles
        WHERE public.telegram_profiles.telegram_id = public.orders.telegram_id
        AND (public.telegram_profiles.id = auth.uid() OR public.telegram_profiles.telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
    )
);

CREATE POLICY "Users can create their own orders" ON public.orders
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.telegram_profiles
        WHERE public.telegram_profiles.telegram_id = public.orders.telegram_id
        AND (public.telegram_profiles.id = auth.uid() OR public.telegram_profiles.telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
    )
);

CREATE POLICY "Users can update their own orders" ON public.orders
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.telegram_profiles
        WHERE public.telegram_profiles.telegram_id = public.orders.telegram_id
        AND (public.telegram_profiles.id = auth.uid() OR public.telegram_profiles.telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
    )
);

CREATE POLICY "Users can delete their own orders" ON public.orders
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.telegram_profiles
        WHERE public.telegram_profiles.telegram_id = public.orders.telegram_id
        AND (public.telegram_profiles.id = auth.uid() OR public.telegram_profiles.telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id')::BIGINT)
    )
);