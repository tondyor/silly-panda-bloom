-- Отключаем RLS временно для изменения схемы таблиц orders и order_messages
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages DISABLE ROW LEVEL SECURITY;

-- Удаляем существующий внешний ключ из order_messages, ссылающийся на orders.id
ALTER TABLE public.order_messages DROP CONSTRAINT IF EXISTS order_messages_order_id_fkey;

-- Удаляем старый первичный ключ (UUID 'id') из таблицы orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pkey CASCADE;
ALTER TABLE public.orders DROP COLUMN IF EXISTS id;

-- Удаляем колонку 'public_id' из таблицы orders
ALTER TABLE public.orders DROP COLUMN IF EXISTS public_id;

-- Добавляем новую колонку 'order_id' типа TEXT
ALTER TABLE public.orders ADD COLUMN order_id TEXT;

-- Удаляем существующую последовательность и функцию, если они были созданы ранее
DROP FUNCTION IF EXISTS public.generate_order_id_value();
DROP SEQUENCE IF EXISTS public.order_id_seq;

-- Создаем новую последовательность для order_id, начиная с 4331
-- (Так как мы удаляем старые public_id, начинаем с фиксированного значения)
CREATE SEQUENCE public.order_id_seq
    START WITH 4331
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Создаем функцию для генерации отформатированного order_id
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

-- Устанавливаем 'order_id' как новый ПЕРВИЧНЫЙ КЛЮЧ
ALTER TABLE public.orders ADD PRIMARY KEY (order_id);

-- Убеждаемся, что order_messages.order_id имеет тип TEXT и пересоздаем внешний ключ
ALTER TABLE public.order_messages ALTER COLUMN order_id TYPE TEXT USING order_id::TEXT;
ALTER TABLE public.order_messages ADD CONSTRAINT fk_order_id
    FOREIGN KEY (order_id) REFERENCES public.orders (order_id) ON DELETE CASCADE;

-- Включаем RLS обратно для orders и order_messages
-- (Политики RLS не изменяются в этой миграции, только включается RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;