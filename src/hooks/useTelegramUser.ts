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
      // 1. Проверка контекста Telegram
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        throw new Error('Приложение должно быть открыто в Telegram.');
      }

      const tg = window.Telegram.WebApp;
      tg.ready();

      // 2. Ожидание инициализации initData с таймаутом
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!tg.initData) {
            console.error("Telegram WebApp initialization timed out. initData is still empty.");
            reject(new Error('Тайм-аут инициализации Telegram. Пожалуйста, перезапустите приложение.'));
          }
        }, 5000); // 5 секунд таймаут

        // Проверяем сразу и с небольшой задержкой
        if (tg.initData) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(() => {
            if (tg.initData) {
              clearTimeout(timeout);
              resolve();
            }
          }, 300);
        }
      });
      
      if (!tg.initData) {
        throw new Error('Не удалось получить данные от Telegram. Убедитесь, что приложение запущено через бота.');
      }

      // 3. Валидация и регистрация на бэкенде
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