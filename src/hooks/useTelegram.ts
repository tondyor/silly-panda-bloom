import { useState, useEffect } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramData {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
  };
  user?: TelegramUser;
}

export const useTelegram = () => {
  const [data, setData] = useState<TelegramData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      if (tg.initData && tg.initData.length > 0) {
        setData({
          initData: tg.initData,
          initDataUnsafe: tg.initDataUnsafe || {},
          user: tg.initDataUnsafe?.user,
        });
      } else {
        setError("Ошибка: данные инициализации Telegram (initData) отсутствуют или пусты. Приложение должно быть запущено из Telegram.");
      }
    } else {
      // Этот случай для разработки в браузере
      console.warn("Telegram Web App script not found. Running in non-Telegram environment.");
      setError("Ошибка: не удалось подключиться к Telegram. Это приложение предназначено для использования только внутри Telegram.");
    }

    setIsLoading(false);
  }, []);

  return { data, error, isLoading };
};