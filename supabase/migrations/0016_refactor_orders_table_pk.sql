-- Отключаем RLS для изменения схемы
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages DISABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики RLS для orders (будут пересозданы позже)
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;

-- Удаляем существующие политики RLS для order_messages (будут пересозданы позже)
DROP POLICY IF EXISTS "Users can view their own order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Bot can insert order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Users can delete their own order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Users can update their own order messages" ON public.order_messages;

-- Удаляем существующий внешний ключ из order_messages, ссылающийся на orders.id
ALTER TABLE public.order_messages DROP CONSTRAINT IF EXISTS order_messages_order_id_fkey;

-- Удаляем старую функцию и последовательность для public_id
DROP FUNCTION IF EXISTS public.generate_order_public_id();
DROP SEQUENCE IF EXISTS public.order_public_id_seq;

-- Переименовываем public_id в order_id
ALTER TABLE public.orders RENAME COLUMN public_id TO order_id;

-- Удаляем старый первичный ключ (UUID 'id') из таблицы orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pkey CASCADE;
ALTER TABLE public.orders DROP COLUMN IF EXISTS id;

-- Устанавливаем order_id как новый первичный ключ
ALTER TABLE public.orders ADD PRIMARY KEY (order_id);

-- Создаем новую последовательность для order_id
CREATE SEQUENCE IF NOT EXISTS public.order_id_seq
    START WITH 4331 -- Убедитесь, что это значение больше любого существующего public_id
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Создаем новую функцию для генерации order_id
CREATE OR REPLACE FUNCTION public.generate_order_id_value()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
BEGIN
    next_val := nextval('public.order_id_seq');
    formatted_id := 'ORD-' || LPAD(next_val::TEXT, 6, '0');
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- Устанавливаем новую функцию как значение по умолчанию для order_id
ALTER TABLE public.orders ALTER COLUMN order_id SET DEFAULT public.generate_order_id_value();

-- Изменяем тип колонки order_id в таблице order_messages на TEXT
ALTER TABLE public.order_messages ALTER COLUMN order_id TYPE TEXT;

-- Пересоздаем внешний ключ из order_messages на новый order_id в orders
ALTER TABLE public.order_messages ADD CONSTRAINT fk_order_id
    FOREIGN KEY (order_id) REFERENCES public.orders (order_id) ON DELETE CASCADE;