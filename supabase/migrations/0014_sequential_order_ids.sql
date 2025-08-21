-- Создаем последовательность для ID заказов, которая начнется с 4331.
-- IF NOT EXISTS предотвращает ошибку, если последовательность уже существует.
CREATE SEQUENCE IF NOT EXISTS public.order_public_id_seq
    START WITH 4331
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Создаем функцию, которая берет следующее значение из последовательности и форматирует его
-- в нужный вид, например, 'ORD-004331'.
CREATE OR REPLACE FUNCTION public.generate_order_public_id()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
BEGIN
    -- Получаем следующее число из последовательности
    next_val := nextval('public.order_public_id_seq');
    
    -- Форматируем ID: добавляем префикс 'ORD-' и дополняем число нулями слева до 6 цифр
    formatted_id := 'ORD-' || LPAD(next_val::TEXT, 6, '0');
    
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql;

-- Устанавливаем нашу новую функцию как значение по умолчанию для колонки public_id в таблице orders.
-- Теперь база данных будет сама генерировать правильный ID для каждого нового заказа.
ALTER TABLE public.orders
ALTER COLUMN public_id SET DEFAULT public.generate_order_public_id();