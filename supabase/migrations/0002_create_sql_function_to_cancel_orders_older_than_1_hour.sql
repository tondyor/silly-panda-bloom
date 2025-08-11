CREATE OR REPLACE FUNCTION public.cancel_old_orders()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.orders
  SET status = 'Отменен'
  WHERE status = 'Новая заявка'
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$;