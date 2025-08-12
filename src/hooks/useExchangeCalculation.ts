import { useMemo } from 'react';
import { useRatesStore } from '../store/ratesStore';

interface UseExchangeCalculationProps {
  fromAmount: number;
  paymentCurrency: 'USDT' | 'RUB';
}

export const useExchangeCalculation = ({ fromAmount, paymentCurrency }: UseExchangeCalculationProps) => {
  const { rates, isLoading } = useRatesStore();
  
  const exchangeRate = rates[paymentCurrency].rate;

  // Мемоизированное вычисление - НЕ ВЫЗЫВАЕТ обновления состояния
  const calculatedVND = useMemo(() => {
    if (!exchangeRate || !fromAmount || fromAmount <= 0) {
      return 0;
    }
    return Math.round(fromAmount * exchangeRate);
  }, [fromAmount, exchangeRate]);
  
  const formattedVND = useMemo(() => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(calculatedVND);
  }, [calculatedVND]);
  
  return {
    calculatedVND,
    formattedVND,
    exchangeRate,
    isLoadingRate: isLoading[paymentCurrency]
  };
};