-- Drop existing related objects to ensure a clean slate
DROP TABLE IF EXISTS public.telegram_users CASCADE;
DROP TABLE IF EXISTS public.tg_sessions CASCADE;

-- Create the new session table as per the technical specification
CREATE TABLE public.tg_sessions (
    user_id BIGINT PRIMARY KEY,
    username TEXT,
    language_code TEXT,
    allows_write_to_pm BOOLEAN DEFAULT FALSE,
    chat_instance TEXT,
    last_query_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.tg_sessions IS 'Stores session and permission data for Telegram users interacting with the Web App.';

-- Enable RLS for security
ALTER TABLE public.tg_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for tg_sessions: only the service role should manage this table from the backend.
CREATE POLICY "Allow full access for service_role"
ON public.tg_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Check if the column to be renamed exists before trying to rename it
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='telegram_id') THEN
    ALTER TABLE public.orders RENAME COLUMN telegram_id TO user_id;
  END IF;
END $$;

-- Drop existing foreign key if it exists, to avoid conflicts
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Add the new foreign key constraint to the tg_sessions table
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.tg_sessions(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.orders.user_id IS 'Foreign key referencing the user who created the order.';

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tg_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS on_tg_sessions_update ON public.tg_sessions;
CREATE TRIGGER on_tg_sessions_update
BEFORE UPDATE ON public.tg_sessions
FOR EACH ROW
EXECUTE PROCEDURE public.update_tg_sessions_updated_at();