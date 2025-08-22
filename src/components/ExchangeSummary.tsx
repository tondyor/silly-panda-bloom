import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

interface ExchangeSummaryProps {
  data: any;
  depositInfo: { network: string; address: string; } | null;
}

export const ExchangeSummary: React.FC<ExchangeSummaryProps> = ({ data, depositInfo }) => {
  if (!data) {
    return null;
  }

  const {
    order_id,
    paymentCurrency,
    fromAmount,
    calculatedVND,
    deliveryMethod,
    vndBankName,
    vndBankAccountNumber,
    deliveryAddress,
    contactPhone,
    usdtNetwork,
  } = data;

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        showSuccess("Адрес скопирован!");
      })
      .catch(err => {
        console.error('Failed to copy address: ', err);
      });
  };

  return (
    <Card className="w-full bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2 pt-4">
        <CardTitle className="text-xl font-bold text-gray-800">
          Заявка #{order_id} успешно создана!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm px-4 pb-4">
        <p className="text-center text-gray-600 text-xs">
          Мы свяжемся с вами в Telegram для подтверждения и завершения обмена.
        </p>
        
        <div className="border-t border-gray-200 pt-2">
          <h3 className="font-semibold text-base mb-1 text-gray-700 text-center">Детали заявки:</h3>
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between">
              <span className="text-gray-500">Отдаете:</span>
              <span className="font-medium text-gray-800">{fromAmount} {paymentCurrency}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">Получаете:</span>
              <span className="font-medium text-green-600">
                {calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
            </li>
            {paymentCurrency === 'USDT' && (
              <li className="flex justify-between">
                <span className="text-gray-500">Сеть для депозита:</span>
                <span className="font-medium text-gray-800">{usdtNetwork}</span>
              </li>
            )}
            <li className="flex justify-between">
              <span className="text-gray-500">Способ получения:</span>
              <span className="font-medium text-gray-800">
                {deliveryMethod === "bank" ? "На банковский счет" : "Наличными"}
              </span>
            </li>
            {deliveryMethod === "bank" && (
              <>
                <li className="flex justify-between">
                  <span className="text-gray-500">Банк:</span>
                  <span className="font-medium text-gray-800">{vndBankName}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Номер счета:</span>
                  <span className="font-medium text-gray-800">{vndBankAccountNumber}</span>
                </li>
              </>
            )}
            {deliveryMethod === "cash" && (
              <li className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0 mr-2">Адрес доставки:</span>
                <span className="font-medium text-gray-800 text-right">{deliveryAddress}</span>
              </li>
            )}
            {contactPhone && (
              <li className="flex justify-between">
                <span className="text-gray-500">Контактный телефон:</span>
                <span className="font-medium text-gray-800">{contactPhone}</span>
              </li>
            )}
          </ul>
        </div>

        {paymentCurrency === 'USDT' && depositInfo && (
          <div className="border-t border-gray-200 pt-2 space-y-2">
            <h3 className="font-semibold text-base text-center text-blue-700">Пополнение</h3>
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 p-2 text-xs">
              <AlertTriangle className="h-4 w-4 !text-red-800" />
              <AlertTitle className="font-semibold mb-1">Важно!</AlertTitle>
              <AlertDescription>
                Отправляйте только USDT в сети {depositInfo.network}. Отправка любой другой монеты или в другой сети приведет к потере средств.
              </AlertDescription>
            </Alert>

            <div className="space-y-1 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span>Сеть:</span>
                <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded">{depositInfo.network}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Сумма:</span>
                <span className="font-semibold">{fromAmount} USDT</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Адрес для пополнения:</label>
              <div className="flex items-center space-x-1">
                <p className="text-xs font-mono bg-gray-100 p-1.5 rounded-md break-all flex-grow">
                  {depositInfo.address}
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyAddress(depositInfo.address)}>
                  <Copy className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-2">
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 p-2 text-xs">
            <Info className="h-4 w-4 !text-blue-800" />
            <AlertTitle className="font-semibold mb-1">
              {deliveryMethod === 'bank' ? 'Банковский перевод' : 'Доставка наличными'}
            </AlertTitle>
            <AlertDescription>
              {deliveryMethod === 'bank'
                ? 'Чек придет вам в Telegram в течение 3-15 минут после подтверждения платежа.'
                : 'Наш курьер свяжется с вами для уточнения деталей доставки.'}
            </AlertDescription>
          </Alert>
        </div>

      </CardContent>
    </Card>
  );
};