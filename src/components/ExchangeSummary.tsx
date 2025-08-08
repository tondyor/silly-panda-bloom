import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface ExchangeSummaryProps {
  data: any;
}

export const ExchangeSummary: React.FC<ExchangeSummaryProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  const {
    orderId,
    paymentCurrency,
    fromAmount,
    calculatedVND,
    deliveryMethod,
    vndBankName,
    vndBankAccountNumber,
    deliveryAddress,
    telegramContact,
    contactPhone,
    usdtNetwork,
  } = data;

  const formattedVND =
    typeof calculatedVND === "number"
      ? calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
      : "";

  return (
    <Card className="w-full bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Заявка #{orderId} успешно создана!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-center text-gray-600">
          Мы свяжемся с вами в Telegram для подтверждения и завершения обмена.
        </p>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-lg mb-2 text-gray-700">Детали заявки:</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span className="text-gray-500">Отдаете:</span>
              <span className="font-medium text-gray-800">{fromAmount} {paymentCurrency}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">Получаете:</span>
              <span className="font-medium text-green-600">{formattedVND}</span>
            </li>
            {paymentCurrency === "USDT" && (
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
                <span className="text-gray-500 shrink-0 mr-4">Адрес доставки:</span>
                <span className="font-medium text-gray-800 text-right">{deliveryAddress}</span>
              </li>
            )}
            <li className="flex justify-between">
              <span className="text-gray-500">Ваш Telegram:</span>
              <span className="font-medium text-gray-800">{telegramContact}</span>
            </li>
            {contactPhone && (
              <li className="flex justify-between">
                <span className="text-gray-500">Контактный телефон:</span>
                <span className="font-medium text-gray-800">{contactPhone}</span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};