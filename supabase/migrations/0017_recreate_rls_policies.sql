-- Включаем RLS для orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Пересоздаем политики для orders
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT TO authenticated USING (
    orders.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can create their own orders" ON public.orders
FOR INSERT TO authenticated WITH CHECK (
    NEW.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own orders" ON public.orders
FOR UPDATE TO authenticated USING (
    orders.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete their own orders" ON public.orders
FOR DELETE TO authenticated USING (
    orders.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);

-- Включаем RLS для order_messages
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Пересоздаем политики для order_messages
CREATE POLICY "Users can view their own order messages" ON public.order_messages
FOR SELECT TO authenticated USING (
    order_messages.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);

CREATE POLICY "Bot can insert order messages" ON public.order_messages
FOR INSERT TO authenticated WITH CHECK (true); -- Предполагаем, что бот вставляет через service_role_key

CREATE POLICY "Users can delete their own order messages" ON public.order_messages
FOR DELETE TO authenticated USING (
    order_messages.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own order messages" ON public.order_messages
FOR UPDATE TO authenticated USING (
    order_messages.telegram_id = (SELECT telegram_id FROM public.telegram_profiles WHERE id = auth.uid())
);