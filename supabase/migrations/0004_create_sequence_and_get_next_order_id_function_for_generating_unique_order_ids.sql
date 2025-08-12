-- Создаем последовательность для номеров заказов
CREATE SEQUENCE IF NOT EXISTS public.order_public_id_seq
  START WITH 583
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Создаем функцию, которая возвращает следующий номер из последовательности
CREATE OR REPLACE FUNCTION public.get_next_order_id()
RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN nextval('public.order_public_id_seq');
END;
$$;