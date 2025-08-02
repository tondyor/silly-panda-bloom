import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FastForward, Headset, AlertTriangle } from "lucide-react";

interface ExchangeInfoSectionProps {
  depositInfo?: {
    network: string;
    address: string;
  } | null;
}

export const ExchangeInfoSection = ({ depositInfo }: ExchangeInfoSectionProps) => {
  return (
    <div className="w-full max-w-lg mx-auto mt-8 space-y-6">
      <Card className="shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-white/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-center text-blue-700">
            {depositInfo ? "Пополнение" : "Почему выбирают VietSwap?"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          {depositInfo ? (
            <div className="space-y-4">
              <p>Для пополнения Вашего баланса USDT, отправьте монеты на адрес указанный ниже.</p>
              <div className="bg-gray-100 p-4 rounded-md space-y-2">
                <p><span className="font-semibold">Сеть:</span> {depositInfo.network}</p>
                <p className="break-all"><span className="font-semibold">Адрес:</span> <span className="text-blue-600 font-mono">{depositInfo.address}</span></p>
                <p><span className="font-semibold">Минимальная сумма:</span> 100 USDT</p> {/* Changed from 0.1 to 100 */}
              </div>
              <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <AlertTriangle className="flex-shrink-0 mt-1" size={20} />
                <p className="text-sm">
                  <span className="font-semibold">Внимание!</span> Пополняйте только USDT в {depositInfo.network}. Если Вы отправите другие монеты либо используете другую сеть, Ваши монеты будут потеряны.
                </p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
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
            <li>Получите VND на ваш банковский счет или курьером от 15 минут.</li>
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