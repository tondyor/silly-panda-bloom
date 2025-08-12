import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface UseTelegramUserResult {
  user: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  retry: () => void;
}

export const useTelegramUser = (): UseTelegramUserResult => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initializeAndRegister = useCallback(async () => {
    setIsLoading(true);
    setUser(null);
    setError(null);

    if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
      throw new Error('Приложение должно быть открыто в Telegram.');
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    if (!tg.isExpanded) {
      tg.expand();
    }

    // Даем Telegram до 500мс на подготовку данных после вызова ready()
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!tg.initData) {
      console.error("Telegram.WebApp.initData is empty. This can happen if the app is opened directly, not through a bot. For debugging, initDataUnsafe is:", tg.initDataUnsafe);
      throw new Error('Не удалось получить данные от Telegram. Убедитесь, что приложение запущено через бота, а не по прямой ссылке.');
    }

    const { data: serverResponse, error: functionError } = await supabase.functions.invoke('register-telegram-user', {
      body: { initData: tg.initData },
    });

    if (functionError) {
      const errorMessage = functionError.message.includes('Invalid data')
        ? 'Ошибка верификации. Данные не являются подлинными.'
        : `Ошибка сервера: ${functionError.message}`;
      throw new Error(errorMessage);
    }

    if (!serverResponse?.success || !serverResponse?.user) {
      throw new Error('Сервер вернул ошибку при регистрации пользователя.');
    }

    const serverUser = serverResponse.user;
    const clientUser: TelegramUser = {
      id: serverUser.telegram_id,
      username: serverUser.username,
      first_name: serverUser.first_name,
      last_name: serverUser.last_name,
    };

    setUser(clientUser);
  }, []);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    initializeAndRegister()
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [retryCount, initializeAndRegister]);

  return {
    user,
    isLoading,
    error,
    isReady: !isLoading && !error && user !== null,
    retry,
  };
};