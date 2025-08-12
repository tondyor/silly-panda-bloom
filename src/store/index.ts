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
}

interface RateState {
  rate: number;
  isLoading: boolean;
  lastUpdated: number | null;
  error: string | null;
}

interface AppState {
  auth: AuthState;
  rates: Record<'USDT' | 'RUB', RateState>;
  actions: {
    auth: {
      authenticate: () => Promise<void>;
    };
    rates: {
      fetchRate: (currency: 'USDT' | 'RUB') => Promise<void>;
    };
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  auth: {
    user: null,
    isLoading: true,
    error: null,
    isReady: false,
  },
  rates: {
    USDT: { rate: 0, isLoading: true, lastUpdated: null, error: null },
    RUB: { rate: 0, isLoading: true, lastUpdated: null, error: null },
  },
  actions: {
    auth: {
      authenticate: async () => {
        set(state => ({ auth: { ...state.auth, isLoading: true, error: null } }));
        try {
          if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
            throw new Error('Приложение должно быть открыто в Telegram.');
          }
          const tg = window.Telegram.WebApp;
          tg.ready();
          if (!tg.isExpanded) tg.expand();

          const initData = await new Promise<string>((resolve, reject) => {
            if (tg.initData) return resolve(tg.initData);
            const timeout = setTimeout(() => reject(new Error('Не удалось получить данные от Telegram (timeout).')), 5000);
            const interval = setInterval(() => {
              if (tg.initData) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(tg.initData);
              }
            }, 100);
          });

          if (!initData) throw new Error('Данные инициализации от Telegram пусты.');

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

          set({ auth: { user: clientUser, isLoading: false, error: null, isReady: true } });
        } catch (err) {
          set({ auth: { user: null, isLoading: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка.', isReady: false } });
        }
      },
    },
    rates: {
      fetchRate: async (currency) => {
        set(state => ({ rates: { ...state.rates, [currency]: { ...state.rates[currency], isLoading: true } } }));
        try {
          const { data, error } = await supabase.functions.invoke("exchange-rates-get", {
            body: { currency },
          });
          if (error) throw new Error(error.message);
          if (!data?.rate) throw new Error("Rate not found in server response.");
          
          set(state => ({
            rates: {
              ...state.rates,
              [currency]: { rate: data.rate, isLoading: false, lastUpdated: Date.now(), error: null },
            },
          }));
        } catch (err) {
          set(state => ({
            rates: {
              ...state.rates,
              [currency]: { ...state.rates[currency], isLoading: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка.' },
            },
          }));
        }
      },
    },
  },
}));