import { useState, useEffect } from 'react';
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

  const logUserDataToServer = async (userData: any) => {
    try {
      console.log('Sending user data to server for logging...');
      const { error } = await supabase.functions.invoke('log-telegram-user-data', {
        body: { userData },
      });
      if (error) {
        console.error('Failed to log user data to server:', error);
      } else {
        console.log('Successfully logged user data to server.');
      }
    } catch (e) {
      console.error('Exception while logging user data:', e);
    }
  };

  const initializeTelegram = async () => {
    console.log('=== TELEGRAM INIT START ===');
    console.log('Attempt:', retryCount + 1);
    
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
      console.error('Not running inside Telegram WebApp');
      setError('Приложение должно быть открыто в Telegram');
      setIsLoading(false);
      return;
    }

    const tg = window.Telegram.WebApp;
    
    if (!tg.isExpanded) {
      tg.ready();
      tg.expand();
    }

    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const userData = tg.initDataUnsafe?.user;
      
      if (userData && userData.id && typeof userData.id === 'number') {
        console.log('✅ User data received from Telegram:', userData);
        
        // ИСПРАВЛЕНО: Вызываем без await, чтобы не блокировать инициализацию
        logUserDataToServer(userData);

        setUser({
          id: userData.id,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
        });
        setIsLoading(false);
        setError(null);
        console.log('=== TELEGRAM INIT SUCCESS ===');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    throw new Error('Не удалось получить данные пользователя от Telegram');
  };

  const retry = () => {
    setRetryCount(0);
    setError(null);
    setIsLoading(true);
    setUser(null);
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    if (retryCount === 0) return;

    const attemptInit = async () => {
      try {
        await initializeTelegram();
      } catch (err) {
        console.error('Telegram init error:', err);
        
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          setError(err instanceof Error ? err.message : 'Превышено максимальное количество попыток.');
          setIsLoading(false);
        }
      }
    };

    attemptInit();
  }, [retryCount]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (isLoading) {
            setError('Время ожидания ответа от Telegram истекло.');
            setIsLoading(false);
        }
    }, 5000);

    setRetryCount(1);

    return () => clearTimeout(timeoutId);
  }, []);

  return {
    user,
    isLoading,
    error,
    isReady: !isLoading && !error && user !== null,
    retry,
  };
};