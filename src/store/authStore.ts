import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface AuthState {
  user: TelegramUser | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  authenticate: () => Promise<void>;
  retry: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isReady: false,
  retry: () => {
    get().authenticate();
  },
  authenticate: async () => {
    set({ isLoading: true, error: null });
    try {
      // Просто и тупо ждем initData. Без проверок.
      const initData = await new Promise<string>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 10 секунд

        const interval = setInterval(() => {
          if (window.Telegram?.WebApp?.initData) {
            clearInterval(interval);
            resolve(window.Telegram.WebApp.initData);
            return;
          }
          
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(interval);
            reject(new Error('Не удалось получить данные от Telegram. Пожалуйста, убедитесь, что приложение открыто через бота и попробуйте снова.'));
          }
        }, 100);
      });

      const tg = window.Telegram.WebApp;
      tg.ready();
      if (!tg.isExpanded) tg.expand();

      const { data: serverResponse, error: functionError } = await supabase.functions.invoke('auth-validate-and-register', {
        body: { initData },
      });

      if (functionError) throw new Error(functionError.message.includes('Invalid data') ? 'Ошибка верификации данных.' : `Ошибка сервера: ${functionError.message}`);
      if (!serverResponse?.success || !serverResponse?.user) throw new Error('Сервер вернул ошибку при регистрации.');

      const serverUser = serverResponse.user;
      const clientUser: TelegramUser = {
        id: serverUser.telegram_id,
        username: serverUser.username,
        first_name: serverUser.first_name,
        last_name: serverUser.last_name,
      };

      set({ user: clientUser, isLoading: false, error: null, isReady: true });
    } catch (err) {
      set({ user: null, isLoading: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка.', isReady: false });
    }
  },
}));