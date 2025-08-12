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

    try {
      // 1. Проверка контекста и ожидание Telegram WebApp
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        throw new Error('Приложение должно быть открыто в Telegram.');
      }

      const tg = window.Telegram.WebApp;
      
      // 2. Вызов ready() и expand()
      tg.ready();
      if (!tg.isExpanded) {
        tg.expand();
      }

      // 3. Ожидание initData с таймаутом
      const initData = await new Promise<string>((resolve, reject) => {
        if (tg.initData) {
          return resolve(tg.initData);
        }
        const timeout = setTimeout(() => {
          reject(new Error('Не удалось получить данные от Telegram (timeout). Убедитесь, что приложение запущено через бота.'));
        }, 5000); // 5 секунд таймаут

        // Попытка получить данные, если они появятся
        const interval = setInterval(() => {
          if (tg.initData) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(tg.initData);
          }
        }, 100);
      });

      if (!initData) {
        throw new Error('Данные инициализации от Telegram пусты. Попробуйте перезапустить приложение.');
      }

      // 4. Валидация на бэкенде и регистрация пользователя
      const { data: serverResponse, error: functionError } = await supabase.functions.invoke('auth-validate-and-register', {
        body: { initData },
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

      // 5. Установка данных пользователя
      const serverUser = serverResponse.user;
      const clientUser: TelegramUser = {
        id: serverUser.telegram_id,
        username: serverUser.username,
        first_name: serverUser.first_name,
        last_name: serverUser.last_name,
      };

      setUser(clientUser);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    initializeAndRegister();
  }, [retryCount, initializeAndRegister]);

  return {
    user,
    isLoading,
    error,
    isReady: !isLoading && !error && user !== null,
    retry,
  };
};