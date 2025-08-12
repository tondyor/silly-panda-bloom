-- Create the notification queue table for reliable message delivery
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  message_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 6,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying of the notification queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_priority ON public.notification_queue(status, priority, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_telegram_id ON public.notification_queue(telegram_id);

-- Create a function to update the `updated_at` timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to the notification_queue table
DROP TRIGGER IF EXISTS trg_notification_queue_updated_at ON public.notification_queue;
CREATE TRIGGER trg_notification_queue_updated_at
  BEFORE UPDATE ON public.notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create the performance metrics table for future monitoring
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  labels jsonb,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_ts ON public.performance_metrics(metric_name, timestamp DESC);