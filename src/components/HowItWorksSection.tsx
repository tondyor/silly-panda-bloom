import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const HowItWorksSection = () => {
  const steps = [
    "Введите сумму USDT и данные для получения VND.",
    "Подтвердите детали обмена.",
    "Отправьте USDT на указанный адрес.",
    "Получите VND на ваш банковский счет или курьером от 15 минут.",
  ];

  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60 mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-center text-blue-700">
          Как это работает?
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-3">
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          {steps.map((step, index) => (
            <li key={index} className="text-base">
              {step}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};