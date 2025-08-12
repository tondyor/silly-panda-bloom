import { useEffect } from 'react';
import { useAppStore } from '@/store';

let isInitialized = false;

export const useAppInitializer = () => {
  const authenticate = useAppStore((state) => state.actions.auth.authenticate);
  const fetchRate = useAppStore((state) => state.actions.rates.fetchRate);

  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      authenticate().then(() => {
        // Fetch rates after successful authentication
        fetchRate('USDT');
        fetchRate('RUB');
      });
    }
  }, [authenticate, fetchRate]);

  // Set up interval to refetch rates periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRate('USDT');
      fetchRate('RUB');
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [fetchRate]);
};