-- Создаем последовательность для генерации уникальных номеров заказов, начиная с 564
CREATE SEQUENCE public.order_public_id_seq START 564;

-- Создаем функцию для безопасного получения следующего номера из последовательности
CREATE OR REPLACE FUNCTION public.get_next_order_id()
RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN nextval('public.order_public_id_seq');
END;
$$;

-- Создаем таблицу для хранения заказов
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  payment_currency TEXT NOT NULL,
  from_amount NUMERIC NOT NULL,
  calculated_vnd NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  delivery_method TEXT NOT NULL,
  vnd_bank_name TEXT,
  vnd_bank_account_number TEXT,
  delivery_address TEXT,
  telegram_contact TEXT NOT NULL,
  contact_phone TEXT,
  usdt_network TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Включаем защиту на уровне строк (RLS) для таблицы orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Политики доступа не создаются, так как все операции будут проходить через безопасную Edge Function с полными правами доступа.