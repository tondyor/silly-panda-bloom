-- Add indexes to the orders table for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_telegram_id ON public.orders(telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_public_id ON public.orders(public_id);

-- Add check constraints for data integrity
-- Note: We wrap this in a DO block to avoid errors if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_positive_amounts') THEN
    ALTER TABLE public.orders ADD CONSTRAINT check_positive_amounts 
    CHECK (from_amount > 0 AND calculated_vnd >= 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_currencies') THEN
    ALTER TABLE public.orders ADD CONSTRAINT check_valid_currencies 
    CHECK (payment_currency IN ('USDT', 'RUB'));
  END IF;
END;
$$;


-- Create the audit log table for tracking order status changes
CREATE TABLE IF NOT EXISTS public.order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_audit_log_order_id ON public.order_audit_log(order_id);

-- Create a trigger function to automatically populate the audit log
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log only if the status has actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_audit_log (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on the orders table
DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_order_status_change();