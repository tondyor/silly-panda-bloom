import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle, Info } from 'lucide-react';
import { toast } from "sonner";

interface PostSubmissionInfoProps {
  depositInfo: { network: string; address: string; } | null;
  formData: any;
}

export const PostSubmissionInfo: React.FC<PostSubmissionInfoProps> = ({ depositInfo, formData }) => {
  if (!formData) return null;

  const { paymentCurrency, deliveryMethod, fromAmount } = formData;

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        toast.success("Адрес скопирован в буфер обмена!", {
          description: address,
          duration: 3000,
        });
      })
      .catch(err => {
        console.error('Failed to copy address: ', err);
        toast.error("Не удалось скопировать адрес.", {
          description: "Пожалуйста, скопируйте вручную.",
          duration: 5000,
        });
      });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 mt-6">
      {paymentCurrency === 'USDT' && depositInfo && (
        <Card className="w-full bg-white/80 backdrop-blur-sm border-2 border-white/60">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-blue-700">
              Пополнение
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
              <AlertTriangle className="h-4 w-4 !text-red-800" />
              <AlertTitle className="font-semibold">Важно!</AlertTitle>
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

      <Card className="w-full bg-white/80 backdrop-blur-sm border-2 border-white/60">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-blue-700">
            Информация о получении
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 !text-blue-800" />
            <AlertTitle className="font-semibold">
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