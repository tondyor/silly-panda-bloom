-- Отключаем RLS для изменения схемы
ALTER TABLE public.telegram_profiles DISABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики RLS для telegram_profiles
DROP POLICY IF EXISTS "Deny client select" ON public.telegram_profiles;
DROP POLICY IF EXISTS "Deny client insert" ON public.telegram_profiles;
DROP POLICY IF EXISTS "Deny client update" ON public.telegram_profiles;
DROP POLICY IF EXISTS "Deny client delete" ON public.telegram_profiles;

-- Удаляем существующий первичный ключ (telegram_id)
ALTER TABLE public.telegram_profiles DROP CONSTRAINT IF EXISTS telegram_profiles_pkey CASCADE;

-- Добавляем новую колонку 'id' типа UUID, которая будет ссылаться на auth.users.id
-- и станет новым первичным ключом.
ALTER TABLE public.telegram_profiles ADD COLUMN id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Устанавливаем новую колонку 'id' как первичный ключ
ALTER TABLE public.telegram_profiles ADD PRIMARY KEY (id);

-- Добавляем уникальный индекс на telegram_id, так как он больше не первичный ключ,
-- но должен оставаться уникальным.
ALTER TABLE public.telegram_profiles ADD CONSTRAINT telegram_profiles_telegram_id_key UNIQUE (telegram_id);

-- Включаем RLS обратно
ALTER TABLE public.telegram_profiles ENABLE ROW LEVEL SECURITY;

-- Пересоздаем политики RLS для telegram_profiles, используя новую колонку 'id'
CREATE POLICY "Users can view their own telegram profile" ON public.telegram_profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own telegram profile" ON public.telegram_profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own telegram profile" ON public.telegram_profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can delete their own telegram profile" ON public.telegram_profiles
FOR DELETE TO authenticated USING (auth.uid() = id);