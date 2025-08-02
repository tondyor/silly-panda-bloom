import React from "react";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";

const ExchangePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-blue-600 text-white p-6">
          <CardTitle className="text-3xl font-extrabold text-center">Обмен USDT на VND</CardTitle>
          <CardDescription className="text-blue-100 text-center mt-2">
            Ваш быстрый и выгодный обмен криптовалюты
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-center text-lg font-semibold text-gray-700">
            <p className="mb-2">
              Получите на <span className="text-green-600 font-bold">0.5% больше</span>, чем по официальному курсу!
            </p>
            <p className="text-sm text-gray-500">
              Мы предлагаем самый выгодный курс для вашего обмена.
            </p>
          </div>
          <ExchangeForm />
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;