ALTER TABLE public.telegram_users
  ADD COLUMN username TEXT;

-- Update RLS policies remain the same as before
-- (No changes needed for policies because username is not used for access control)