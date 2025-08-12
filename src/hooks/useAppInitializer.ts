import { useEffect } from 'react';
import { useAppStore } from '@/store';

let isInitialized = false;

export const useAppInitializer = () => {
  const { authenticate, fetchUsdtRate, fetchRubRate } = useAppStore(state => ({
    authenticate: state.actions.auth.authenticate,
    fetchUsdtRate: () => state.actions.rates.fetchRate('USDT'),
    fetchRubRate: () => state.actions.rates.fetchRate('RUB'),
  }));

  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      authenticate().then(() => {
        // Fetch rates after successful authentication
        fetchUsdtRate();
        fetchRubRate();
      });
    }
  }, [authenticate, fetchUsdtRate, fetchRubRate]);

  // Set up interval to refetch rates periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsdtRate();
      fetchRubRate();
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUsdtRate, fetchRubRate]);
};