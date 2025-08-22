import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, Calendar, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface OrderHistoryProps {
  telegramId: number;
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

const fetchCompletedOrders = async (telegramId: number): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('status', 'Оплачен')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const OrderHistory: React.FC<OrderHistoryProps> = ({ telegramId }) => {
  const { data: orders, isLoading, isError, error } = useQuery<Order[], Error>({
    queryKey: ['completedOrders', telegramId],
    queryFn: () => fetchCompletedOrders(telegramId),
    enabled: !!telegramId,
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
        <AlertTitle>Ошибка загрузки истории</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center text-gray-600 p-6">
        <p>У вас пока нет завершенных заявок.</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4">
      <Accordion type="single" collapsible className="w-full">
        {orders.map((order) => (
          <AccordionItem value={order.order_id} key={order.order_id} className="border-b border-gray-200 bg-white/50 rounded-lg mb-2 shadow-sm">
            <AccordionTrigger className="hover:no-underline p-3 text-left rounded-lg">
              <div className="flex flex-col w-full space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-gray-800">#{order.order_id}</span>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
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
                  <span className="text-gray-500">Способ получения:</span>
                  <span className="font-medium">{order.delivery_method === 'bank' ? 'Банковский перевод' : 'Наличные'}</span>
                </li>
                {order.delivery_method === 'bank' && (
                  <>
                    <li className="flex justify-between">
                      <span className="text-gray-500">Банк:</span>
                      <span className="font-medium">{order.vnd_bank_name}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-500">Номер счета:</span>
                      <span className="font-medium">{order.vnd_bank_account_number}</span>
                    </li>
                  </>
                )}
                {order.delivery_method === 'cash' && (
                  <li className="flex justify-between items-start">
                    <span className="text-gray-500 shrink-0 mr-2">Адрес:</span>
                    <span className="font-medium text-right">{order.delivery_address}</span>
                  </li>
                )}
                {order.payment_currency === 'USDT' && order.usdt_network && (
                  <li className="flex justify-between">
                    <span className="text-gray-500">Сеть USDT:</span>
                    <span className="font-medium">{order.usdt_network}</span>
                  </li>
                )}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};