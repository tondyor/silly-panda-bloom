import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { formatDistanceToNow, type Locale } from 'date-fns';
import { ru, en, vi } from 'date-fns/locale'; // Import all necessary locales
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const USDT_WALLETS: Record<string, string> = {
  BEP20: "0x66095f5be059C3C3e1f44416aEAd8085B8F42F3e",
  TON: "UQCgn4ztELQZLiGWTtOFcZoN22Lf4B6Vd7IO6WsBZuXM8edg",
  TRC20: "TAAQEjDBQK5hN1MGumVUjtzX42qRYCjTkB",
  ERC20: "0x54C7fA815AE5a5DDEd5DAa4A36CFB6903cE7D896",
  SPL: "9vBe1AP3197jP4PSjC2jUsyadr82Sey3nXbxAT3LSQwm",
};

interface Order {
  order_id: string;
  created_at: string;
  payment_currency: string;
  from_amount: number;
  calculated_vnd: number;
  usdt_network?: string;
}

interface PendingOrdersProps {
  orders: Order[];
  initData: string;
}

const locales: { [key: string]: Locale } = {
  ru: ru,
  en: en,
  vi: vi,
};

const TimeLeft: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = locales[i18n.language.split('-')[0]] || ru; // Fallback to ru

  const calculateTimeLeft = () => {
    const createdDate = new Date(createdAt);
    const expiryDate = new Date(createdDate.getTime() + 60 * 60 * 1000);
    return formatDistanceToNow(expiryDate, { locale: currentLocale, addSuffix: true });
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000 * 60); // Update every minute

    return () => clearInterval(timer);
  }, [createdAt, currentLocale]);

  return <span>{t('pendingOrders.expiresIn', { timeLeft })}</span>;
};

export const PendingOrders: React.FC<PendingOrdersProps> = ({ orders, initData }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => showSuccess(t("pendingOrders.addressCopied")))
      .catch(err => console.error('Failed to copy address: ', err));
  };

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.functions.invoke('cancel-order', {
        body: { initData, orderId },
      });
      if (error) {
        // Attempt to parse the error message from the function response
        const errorBody = await error.context.json();
        throw new Error(errorBody.error || error.message);
      }
    },
    onSuccess: () => {
      showSuccess(t("pendingOrders.orderCancelledSuccess"));
      queryClient.invalidateQueries({ queryKey: ['orders', initData] });
    },
    onError: (error) => {
      showError(`${t("pendingOrders.cancelError")} ${error.message}`);
    },
    onSettled: () => {
      setOrderToCancel(null);
      setIsAlertOpen(false);
    },
  });

  const handleCancelClick = (orderId: string) => {
    setOrderToCancel(orderId);
    setIsAlertOpen(true);
  };

  const handleConfirmCancel = () => {
    if (orderToCancel) {
      cancelOrderMutation.mutate(orderToCancel);
    }
  };

  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <>
      <div className="p-2 sm:p-4 space-y-4">
          <h2 className="text-lg font-bold text-center text-gray-800">{t("pendingOrders.activeOrdersTitle")}</h2>
          {orders.map((order) => {
              const depositAddress = (order.payment_currency === 'USDT' && order.usdt_network) 
                  ? USDT_WALLETS[order.usdt_network] 
                  : null;

              return (
                  <Card key={order.order_id} className="w-full bg-white/80 backdrop-blur-sm shadow-lg">
                      <CardHeader className="text-center pb-2 pt-4">
                          <CardTitle className="text-lg font-bold text-gray-800">
                              {t("pendingOrders.orderIdTitle", { orderId: order.order_id })}
                          </CardTitle>
                          <div className="flex items-center justify-center text-sm text-yellow-600">
                              <Clock className="h-4 w-4 mr-1" />
                              <TimeLeft createdAt={order.created_at} />
                          </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm px-4 pb-4">
                          <ul className="space-y-1 text-xs">
                              <li className="flex justify-between">
                                  <span className="text-gray-500">{t("pendingOrders.youSendLabel")}</span>
                                  <span className="font-medium text-gray-800">{order.from_amount} {order.payment_currency}</span>
                              </li>
                              <li className="flex justify-between">
                                  <span className="text-gray-500">{t("pendingOrders.youReceiveLabel")}</span>
                                  <span className="font-medium text-green-600">
                                      {order.calculated_vnd.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                  </span>
                              </li>
                          </ul>

                          {order.payment_currency === 'USDT' && depositAddress && order.usdt_network && (
                              <div className="border-t border-gray-200 pt-2 space-y-2">
                                  <h3 className="font-semibold text-base text-center text-blue-700">{t("pendingOrders.depositSectionTitle")}</h3>
                                  <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 p-2 text-xs">
                                      <AlertTriangle className="h-4 w-4 !text-red-800" />
                                      <AlertTitle className="font-semibold mb-1">{t("pendingOrders.importantTitle")}</AlertTitle>
                                      <AlertDescription>
                                          {t("pendingOrders.usdtWarning", { network: order.usdt_network })}
                                      </AlertDescription>
                                  </Alert>
                                  <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">{t("pendingOrders.depositAddressLabel")}</label>
                                      <div className="flex items-center space-x-1">
                                          <p className="text-xs font-mono bg-gray-100 p-1.5 rounded-md break-all flex-grow">
                                              {depositAddress}
                                          </p>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyAddress(depositAddress)}>
                                              <Copy className="h-4 w-4 text-gray-600" />
                                          </Button>
                                      </div>
                                  </div>
                              </div>
                          )}
                          <div className="border-t border-gray-200 pt-3 mt-3">
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleCancelClick(order.order_id)}
                              disabled={cancelOrderMutation.isPending && cancelOrderMutation.variables === order.order_id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {cancelOrderMutation.isPending && cancelOrderMutation.variables === order.order_id ? t("pendingOrders.cancellingButton") : t("pendingOrders.cancelOrderButton")}
                            </Button>
                          </div>
                      </CardContent>
                  </Card>
              );
          })}
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pendingOrders.cancelConfirmationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pendingOrders.cancelConfirmationDescription", { orderId: orderToCancel })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToCancel(null)}>{t("pendingOrders.backButton")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelOrderMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelOrderMutation.isPending ? t("pendingOrders.cancellingButton") : t("pendingOrders.confirmCancelButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};