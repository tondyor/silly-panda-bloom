import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle, Info } from 'lucide-react';
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface PostSubmissionInfoProps {
  depositInfo: { network: string; address: string; } | null;
  formData: any;
}

export const PostSubmissionInfo: React.FC<PostSubmissionInfoProps> = ({ depositInfo, formData }) => {
  const { t } = useTranslation();

  if (!formData) return null;

  const { paymentCurrency, deliveryMethod, fromAmount } = formData;

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        toast.success(t('notifications.copySuccess.title'), {
          description: address,
          duration: 3000,
        });
      })
      .catch(err => {
        console.error('Failed to copy address: ', err);
        toast.error(t('notifications.copyError.title'), {
          description: t('notifications.copyError.description'),
          duration: 5000,
        });
      });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 mt-6">
      {paymentCurrency === 'USDT' && depositInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Пополнение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Важно!</AlertTitle>
              <AlertDescription>
                Отправляйте только USDT в сети {depositInfo.network}. Отправка любой другой монеты или в другой сети приведет к потере средств.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between items-center">
                <span>Сеть:</span>
                <span className="font-semibold bg-gray-200 px-2 py-1 rounded">{depositInfo.network}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Мин. сумма:</span>
                <span className="font-semibold">{fromAmount} USDT</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Адрес для пополнения:</label>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-mono bg-gray-100 p-2 rounded-md break-all flex-grow">
                  {depositInfo.address}
                </p>
                <Button variant="ghost" size="icon" onClick={() => handleCopyAddress(depositInfo.address)}>
                  <Copy className="h-5 w-5 text-gray-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Информация о получении</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>
              {deliveryMethod === 'bank' ? 'Банковский перевод' : 'Доставка наличными'}
            </AlertTitle>
            <AlertDescription>
              {deliveryMethod === 'bank'
                ? 'Чек придет вам в Telegram в течение 3-15 минут после подтверждения платежа.'
                : 'Наш курьер свяжется с вами для уточнения деталей доставки.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};