import { useState, useEffect, useCallback, useRef } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebAppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  user: TelegramUser | null;
  webApp: any | null;
}

function extractUserFromInitData(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    
    const user = JSON.parse(decodeURIComponent(userStr));
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code
    };
  } catch (error) {
    console.error('Failed to extract user from initData:', error);
    return null;
  }
}

export const useTelegramWebApp = (): TelegramWebAppState & { retry: () => void } => {
  const [state, setState] = useState<TelegramWebAppState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    user: null,
    webApp: null
  });
  
  const retryCount = useRef(0);
  const maxRetries = 3;
  
  const initializeTelegram = useCallback(async () => {
    console.log('[Telegram] Starting direct initialization...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Прямая попытка инициализации без проверок
      if (!window.Telegram || !window.Telegram.WebApp) {
        throw new Error('Telegram WebApp API не найдено. Убедитесь, что приложение открыто в Telegram.');
      }

      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      
      const initData = webApp.initData;
      
      if (!initData) {
        throw new Error('Не удалось получить данные пользователя (initData) от Telegram. Попробуйте перезапустить приложение.');
      }
      
      const user = extractUserFromInitData(initData);
      if (!user) {
        throw new Error('Не удалось извлечь данные пользователя из initData.');
      }
      
      console.log('[Telegram] User extracted successfully:', user.first_name);
      
      setState({
        isInitialized: true,
        isLoading: false,
        error: null,
        user: user,
        webApp: webApp
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('[Telegram] Initialization failed:', errorMessage);
      
      setState({
        isInitialized: false,
        isLoading: false,
        error: errorMessage,
        user: null,
        webApp: null
      });
    }
  }, []);
  
  const retry = useCallback(() => {
    if (retryCount.current >= maxRetries) {
      setState(prev => ({
        ...prev,
        error: 'Превышено количество попыток. Пожалуйста, перезагрузите приложение.'
      }));
      return;
    }
    retryCount.current++;
    initializeTelegram();
  }, [initializeTelegram]);
  
  useEffect(() => {
    initializeTelegram();
  }, [initializeTelegram]);
  
  return {
    ...state,
    retry
  };
};