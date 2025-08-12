-- Переименовываем столбец для единообразия
ALTER TABLE public.orders RENAME COLUMN telegram_user_id TO telegram_id;

-- Добавляем внешний ключ для обеспечения целостности данных
-- Это связывает заявки с пользователями Telegram
ALTER TABLE public.orders 
ADD CONSTRAINT orders_telegram_id_fkey 
FOREIGN KEY (telegram_id) 
REFERENCES public.telegram_users(telegram_id) 
ON DELETE SET NULL;