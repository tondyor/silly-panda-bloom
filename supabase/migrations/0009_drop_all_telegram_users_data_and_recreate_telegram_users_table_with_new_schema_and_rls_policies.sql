-- Удаляем все данные из telegram_users
DELETE FROM public.telegram_users;

-- Удаляем таблицу, если существует
DROP TABLE IF EXISTS public.telegram_users;

-- Создаем таблицу telegram_users с нужными полями
CREATE TABLE public.telegram_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  language_code TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_deals_count INTEGER DEFAULT 0,
  total_volume_vnd NUMERIC DEFAULT 0,
  total_volume_usdt NUMERIC DEFAULT 0
);

-- Включаем RLS
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Политика SELECT - пользователь видит только свои данные
CREATE POLICY "Users can select their own data" ON public.telegram_users
FOR SELECT TO authenticated USING (telegram_id::text = current_setting('request.jwt.claim.sub'));

-- Политика INSERT - пользователь может вставлять только свои данные
CREATE POLICY "Users can insert their own data" ON public.telegram_users
FOR INSERT TO authenticated WITH CHECK (telegram_id::text = current_setting('request.jwt.claim.sub'));

-- Политика UPDATE - пользователь может обновлять только свои данные
CREATE POLICY "Users can update their own data" ON public.telegram_users
FOR UPDATE TO authenticated USING (telegram_id::text = current_setting('request.jwt.claim.sub'));

-- Политика DELETE - пользователь может удалять только свои данные
CREATE POLICY "Users can delete their own data" ON public.telegram_users
FOR DELETE TO authenticated USING (telegram_id::text = current_setting('request.jwt.claim.sub'));