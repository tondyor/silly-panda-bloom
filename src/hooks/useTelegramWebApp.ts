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

const TELEGRAM_DOMAINS = ['t.me', 'telegram.org', 'telegram.me', 'web.telegram.org'];
const TELEGRAM_USER_AGENTS = ['TelegramBot', 'Telegram', 'TDesktop'];

class TelegramContextValidator {
  static validateContext(): { isValid: boolean; reason?: string } {
    // В development режиме пропускаем проверки
    const isDevelopment = window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      console.warn('[DEV] Telegram context validation skipped');
      return { isValid: true };
    }
    
    // Проверки для production
    const userAgent = navigator.userAgent;
    const hasTelegramUA = TELEGRAM_USER_AGENTS.some(agent => userAgent.includes(agent));
    
    const referrer = document.referrer;
    const hasTelegramReferrer = TELEGRAM_DOMAINS.some(domain => referrer.includes(domain));
    
    const hasWebAppAPI = window.Telegram && window.Telegram.WebApp;
    
    const urlParams = new URLSearchParams(window.location.search);
    const hasTgParam = urlParams.has('tgWebAppData') || 
      urlParams.has('tgWebAppVersion') ||
      window.location.hash.includes('tgWebAppData');
    
    const isValid = hasTelegramUA || hasTelegramReferrer || hasWebAppAPI || hasTgParam;
    
    if (!isValid) {
      return { 
        isValid: false, 
        reason: `Not in Telegram context. UA: ${hasTelegramUA}, Ref: ${hasTelegramReferrer}, API: ${hasWebAppAPI}, Params: ${hasTgParam}` 
      };
    }
    
    return { isValid: true };
  }
  
  static extractUserFromInitData(initData: string): TelegramUser | null {
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
  const maxRetries = 5;
  
  const initializeTelegram = useCallback(async () => {
    console.log('[Telegram] Starting initialization...');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 1. Проверяем контекст Telegram
      const contextValidation = TelegramContextValidator.validateContext();
      if (!contextValidation.isValid) {
        throw new Error(contextValidation.reason || 'Invalid Telegram context');
      }
      
      // 2. Ждем инициализации Telegram WebApp API
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkTelegramAPI = () => {
          attempts++;
          
          if (window.Telegram?.WebApp) {
            try {
              window.Telegram.WebApp.ready();
              window.Telegram.WebApp.expand();
              console.log('[Telegram] WebApp initialized');
              resolve();
              return;
            } catch (error) {
              console.error('[Telegram] WebApp init error:', error);
            }
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error('Telegram WebApp API not available'));
            return;
          }
          
          setTimeout(checkTelegramAPI, 100);
        };
        
        const timeout = setTimeout(() => {
          reject(new Error('Telegram WebApp initialization timeout'));
        }, 10000);
        
        const originalResolve = resolve;
        resolve = () => {
          clearTimeout(timeout);
          originalResolve();
        };
        
        checkTelegramAPI();
      });
      
      // 3. Получаем данные пользователя
      const webApp = window.Telegram.WebApp;
      const initData = webApp.initData;
      
      if (!initData) {
        // В development режиме создаем mock пользователя
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isDevelopment) {
          console.warn('[DEV] Using mock user data');
          const mockUser: TelegramUser = {
            id: 12345678,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          };
          
          setState({
            isInitialized: true,
            isLoading: false,
            error: null,
            user: mockUser,
            webApp: webApp
          });
          return;
        }
        
        throw new Error('No initData available from Telegram');
      }
      
      // 4. Извлекаем пользователя из initData
      const user = TelegramContextValidator.extractUserFromInitData(initData);
      if (!user) {
        throw new Error('Failed to extract user data from initData');
      }
      
      console.log('[Telegram] User extracted:', user.first_name);
      
      // 5. Финальная инициализация
      setState({
        isInitialized: true,
        isLoading: false,
        error: null,
        user: user,
        webApp: webApp
      });
      
      retryCount.current = 0;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
        error: 'Maximum retry attempts exceeded. Please reload the app.'
      }));
      return;
    }
    
    retryCount.current++;
    console.log(`[Telegram] Retry attempt ${retryCount.current}/${maxRetries}`);
    
    const delay = Math.min(1000 * Math.pow(2, retryCount.current - 1), 16000);
    
    setTimeout(() => {
      initializeTelegram();
    }, delay);
  }, [initializeTelegram]);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      initializeTelegram();
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [initializeTelegram]);
  
  return {
    ...state,
    retry
  };
};