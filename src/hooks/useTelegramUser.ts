import { useState, useEffect } from 'react';

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
    
    console.log('window.Telegram:', window.Telegram);
    console.log('WebApp:', tg);
    console.log('initData:', tg.initData);
    console.log('initDataUnsafe:', tg.initDataUnsafe);
    console.log('user:', tg.initDataUnsafe?.user);
    
    if (!tg.isExpanded) {
      tg.ready();
      tg.expand();
    }

    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const userData = tg.initDataUnsafe?.user;
      
      if (userData && userData.id && typeof userData.id === 'number') {
        console.log('✅ User data received:', userData);
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
      
      console.log(`Waiting for user data... attempt ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    console.error('Failed to get user data after 1 second');
    throw new Error('Не удалось получить данные пользователя');
  };

  const retry = () => {
    setRetryCount(0); // Сбрасываем счетчик для полного перезапуска
    setError(null);
    setIsLoading(true);
    setUser(null);
    // Запускаем новый цикл попыток
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    if (retryCount === 0) return; // Не запускаем при первом рендере, только после вызова retry

    const attemptInit = async () => {
      try {
        await initializeTelegram();
      } catch (err) {
        console.error('Telegram init error:', err);
        
        if (retryCount < 3) {
          console.log(`Retrying in 1 second... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          setError(err instanceof Error ? err.message : 'Превышено максимальное количество попыток. Перезапустите приложение.');
          setIsLoading(false);
        }
      }
    };

    attemptInit();
  }, [retryCount]);

  // Запускаем первую попытку
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (isLoading) {
            setError('Время ожидания ответа от Telegram истекло.');
            setIsLoading(false);
        }
    }, 5000); // Общий таймаут 5 секунд

    setRetryCount(1); // Запускаем первую попытку

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