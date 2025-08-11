SELECT cron.schedule(
  'cancel_old_orders_job',
  '*/5 * * * *',
  $$CALL public.cancel_old_orders()$$
);