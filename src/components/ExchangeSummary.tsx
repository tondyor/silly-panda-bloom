import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExchangeSummaryProps {
  data: any; // This will contain all submitted form data
}

export const ExchangeSummary = ({ data }: ExchangeSummaryProps) => {
  const { usdtAmount, calculatedVND, usdtNetwork, deliveryMethod, telegramContact, orderId } = data;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-800">Ваш запрос на обмен</h2>
      <p className="text-center text-gray-600">Пожалуйста, проверьте детали вашего обмена:</p>

      {orderId && (
        <div className="text-center text-3xl font-extrabold text-blue-700 mb-4">
          Номер вашего заказа: <span className="text-orange-500">{orderId}</span>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2">
        <p><span className="font-semibold">Сумма USDT:</span> {usdtAmount} USDT</p>
        <p><span className="font-semibold">Вы получите:</span> {calculatedVND.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
        <p><span className="font-semibold">Сеть USDT:</span> {usdtNetwork}</p>
        <p><span className="font-semibold">Telegram:</span> {telegramContact}</p>
        <p><span className="font-semibold">Способ получения:</span> {deliveryMethod === 'bank' ? 'На банковский счет' : 'Наличными (доставка)'}</p>
        
        {deliveryMethod === 'bank' && (
          <>
            <p><span className="font-semibold">Номер счета:</span> {data.vndBankAccountNumber}</p>
            <p><span className="font-semibold">Название банка:</span> {data.vndBankName}</p>
          </>
        )}
        {deliveryMethod === 'cash' && (
          <>
            <p><span className="font-semibold">Адрес доставки:</span> {data.deliveryAddress}</p>
            <p><span className="font-semibold">Контактный телефон:</span> {data.contactPhone}</p>
          </>
        )}
      </div>

      <p className="text-center text-sm text-gray-500">
        Ваш запрос обрабатывается. Пожалуйста, следуйте инструкциям ниже для завершения обмена.
      </p>
    </div>
  );
};