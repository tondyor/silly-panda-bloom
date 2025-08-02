import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FastForward, Headset } from "lucide-react";

export const ExchangeInfoSection = () => {
  return (
    <div className="w-full max-w-lg mx-auto mt-8 space-y-6">
      <Card className="shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-white/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-center text-blue-700">Почему выбирают VietSwap?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <div className="flex items-start space-x-3">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
            <p>
              <span className="font-semibold">Выгодный курс:</span> Мы предлагаем курс на 0.5% лучше официального, чтобы вы получали максимум от каждого обмена.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <FastForward className="text-orange-500 flex-shrink-0 mt-1" size={20} />
            <p>
              <span className="font-semibold">Быстрые транзакции:</span> Наши процессы оптимизированы для мгновенного обмена, чтобы вы не ждали.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <Headset className="text-purple-500 flex-shrink-0 mt-1" size={20} />
            <p>
              <span className="font-semibold">Надежная поддержка:</span> Наша команда всегда готова помочь с любыми вопросами 24/7.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-white/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-center text-blue-700">Как это работает?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>Введите сумму USDT и данные для получения VND.</li>
            <li>Подтвердите детали обмена.</li>
            <li>Отправьте USDT на указанный адрес.</li>
            <li>Получите VND на ваш банковский счет.</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-white/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-center text-blue-700">Свяжитесь с нами</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-700">
          <p className="mb-2">Есть вопросы? Мы здесь, чтобы помочь!</p>
          <p className="font-semibold">Email: support@vietswap.com</p>
          <p className="font-semibold">Telegram: @VietSwapSupport</p>
        </CardContent>
      </Card>
    </div>
  );
};