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
    console.log('=== TELEGRAM INIT START ===');
    
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
      throw new Error('Приложение должно быть открыто в Telegram');
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    if (!tg.isExpanded) {
      tg.expand();
    }

    let attempts = 0;
    // Увеличиваем время ожидания до 10 секунд (100 попыток по 100 мс)
    while (!tg.initData && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!tg.initData) {
      // Обновляем сообщение об ошибке, чтобы оно было более понятным
      throw new Error('Время ожидания ответа от Telegram истекло.');
    }
    
    console.log('✅ Got initData, proceeding to server validation.');

    const { data: serverResponse, error: functionError } = await supabase.functions.invoke('register-telegram-user', {
      body: { initData: tg.initData },
    });

    if (functionError) {
      console.error('Server validation error:', functionError);
      const errorMessage = functionError.message.includes('Invalid data') 
        ? 'Ошибка верификации. Данные не являются подлинными.'
        : `Ошибка сервера: ${functionError.message}`;
      throw new Error(errorMessage);
    }
    
    if (!serverResponse.success || !serverResponse.user) {
      console.error('Server responded with an error:', serverResponse);
      throw new Error('Сервер вернул ошибку при регистрации пользователя.');
    }

    console.log('✅ Server validation successful. User registered/updated.');
    
    const serverUser = serverResponse.user;
    const clientUser: TelegramUser = {
        id: serverUser.telegram_id,
        username: serverUser.username,
        first_name: serverUser.first_name,
        last_name: serverUser.last_name,
    };
    
    setUser(clientUser);
    setError(null);
    setIsLoading(false);
    console.log('=== TELEGRAM INIT SUCCESS ===');
  }, []);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setIsLoading(true);
    setUser(null);
  }, []);

  useEffect(() => {
    initializeAndRegister().catch(err => {
      console.error('Initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка.');
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