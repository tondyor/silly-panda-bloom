import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, Calendar, Repeat } from 'lucide-react';
import { format, type Locale } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { enUS as en } from 'date-fns/locale/en-US';
import { vi } from 'date-fns/locale/vi';
import { useTranslation } from 'react-i18next';
import { PendingOrders } from './PendingOrders';

interface OrderHistoryProps {
  initData: string;
}

interface Order {
  order_id: string;
  created_at: string;
  payment_currency: string;
  from_amount: number;
  calculated_vnd: number;
  delivery_method: string;
  vnd_bank_name?: string;
  vnd_bank_account_number?: string;
  delivery_address?: string;
  usdt_network?: string;
}

interface OrdersResponse {
  pendingOrders: Order[];
  completedOrders: Order[];
}

const locales: { [key: string]: Locale } = {
  ru: ru,
  en: en,
  vi: vi,
};

const fetchOrders = async (initData: string): Promise<OrdersResponse> => {
  const { data, error } = await supabase.functions.invoke('get-order-history', {
    body: { initData },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    pendingOrders: data.pendingOrders || [],
    completedOrders: data.completedOrders || [],
  };
};

export const OrderHistory: React.FC<OrderHistoryProps> = ({ initData }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = locales[i18n.language.split('-')[0]] || ru; // Fallback to ru

  const { data, isLoading, isError, error } = useQuery<OrdersResponse, Error>({
    queryKey: ['orders', initData],
    queryFn: () => fetchOrders(initData),
    enabled: !!initData,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("orderHistory.loadingErrorTitle")}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const hasPendingOrders = data?.pendingOrders && data.pendingOrders.length > 0;
  const hasCompletedOrders = data?.completedOrders && data.completedOrders.length > 0;

  if (!hasPendingOrders && !hasCompletedOrders) {
    return (
      <div className="text-center text-gray-600 p-6">
        <p>{t("orderHistory.noOrders")}</p>
      </div>
    );
  }

  return (
    <div>
      <PendingOrders orders={data?.pendingOrders || []} initData={initData} />

      {hasCompletedOrders && (
        <div className="p-2 sm:p-4">
          <h2 className="text-lg font-bold text-center text-gray-800 mb-2">{t("orderHistory.completedOrdersTitle")}</h2>
          <Accordion type="single" collapsible className="w-full">
            {data.completedOrders.map((order) => (
              <AccordionItem value={order.order_id} key={order.order_id} className="border-b border-gray-200 bg-white/50 rounded-lg mb-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline p-3 text-left rounded-lg">
                  <div className="flex flex-col w-full space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-800">#{order.order_id}</span>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm', { locale: currentLocale })}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{order.from_amount.toLocaleString('ru-RU')} {order.payment_currency}</span>
                      <Repeat className="h-4 w-4 text-gray-400 mx-2" />
                      <span className="font-semibold text-green-700">
                        {order.calculated_vnd.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 pt-0 bg-gray-50/50 rounded-b-lg">
                  <ul className="space-y-1 text-xs text-gray-700 pt-2 border-t border-gray-200">
                    <li className="flex justify-between">
                      <span className="text-gray-500">{t("orderHistory.deliveryMethodLabel")}</span>
                      <span className="font-medium">{order.delivery_method === 'bank' ? t("orderHistory.deliveryMethodBank") : t("orderHistory.deliveryMethodCash")}</span>
                    </li>
                    {order.delivery_method === 'bank' && (
                      <>
                        <li className="flex justify-between">
                          <span className="text-gray-500">{t("orderHistory.bankLabel")}</span>
                          <span className="font-medium">{order.vnd_bank_name}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-500">{t("orderHistory.accountNumberLabel")}</span>
                          <span className="font-medium">{order.vnd_bank_account_number}</span>
                        </li>
                      </>
                    )}
                    {order.delivery_method === 'cash' && (
                      <li className="flex justify-between items-start">
                        <span className="text-gray-500 shrink-0 mr-2">{t("orderHistory.addressLabel")}</span>
                        <span className="font-medium text-right">{order.delivery_address}</span>
                      </li>
                    )}
                    {order.payment_currency === 'USDT' && order.usdt_network && (
                      <li className="flex justify-between">
                        <span className="text-gray-500">{t("orderHistory.usdtNetworkLabel")}</span>
                        <span className="font-medium">{order.usdt_network}</span>
                      </li>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
};