import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface RateData {
  rate: number;
  sourceCount: number;
}

interface RatesState {
  rates: Record<'USDT' | 'RUB', RateData>;
  isLoading: Record<'USDT' | 'RUB', boolean>;
  error: Record<'USDT' | 'RUB', string | null>;
  lastUpdated: Record<'USDT' | 'RUB', number | null>;
  fetchRate: (currency: 'USDT' | 'RUB') => Promise<void>;
}

export const useRatesStore = create<RatesState>((set, get) => ({
  rates: {
    USDT: { rate: 0, sourceCount: 0 },
    RUB: { rate: 0, sourceCount: 0 },
  },
  isLoading: {
    USDT: true,
    RUB: true,
  },
  error: {
    USDT: null,
    RUB: null,
  },
  lastUpdated: {
    USDT: null,
    RUB: null,
  },
  fetchRate: async (currency) => {
    const state = get();
    // Кеширование - не запрашиваем чаще чем раз в 10 секунд
    if (state.lastUpdated[currency] && Date.now() - state.lastUpdated[currency]! < 10000) {
      return;
    }
    
    set(state => ({
      isLoading: { ...state.isLoading, [currency]: true },
      error: { ...state.error, [currency]: null }
    }));

    try {
      const { data, error } = await supabase.functions.invoke("exchange-rates-get", {
        body: { currency },
      });

      if (error) throw new Error(error.message);
      if (!data?.rate) throw new Error("Rate not found in server response.");

      const currentRate = get().rates[currency].rate;
      const hasChanged = currentRate !== data.rate;

      if (hasChanged) {
        set(state => ({
          rates: { ...state.rates, [currency]: data },
          lastUpdated: { ...state.lastUpdated, [currency]: Date.now() },
        }));
      }
    } catch (err) {
      set(state => ({
        error: { ...state.error, [currency]: err instanceof Error ? err.message : 'Неизвестная ошибка.' },
      }));
    } finally {
      set(state => ({
        isLoading: { ...state.isLoading, [currency]: false },
      }));
    }
  },
}));