import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from 'lucide-react'; // Using Send icon for Telegram
import { toast } from "sonner"; // Import toast for notifications

interface ExchangeInfoSectionProps {
  depositInfo: { network: string; address: string; } | null;
  deliveryMethodAfterSubmit: 'bank' | 'cash' | null;
  submittedDeliveryAddress: string | null;
}

export const ExchangeInfoSection = ({ depositInfo, deliveryMethodAfterSubmit, submittedDeliveryAddress }: ExchangeInfoSectionProps) => {
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
    <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60 mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-center text-blue-700">
          {depositInfo ? "Информация для обмена" : "Свяжитесь с нами"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        {depositInfo ? (
          <div className="space-y-4">
            <p>Для пополнения Вашего баланса USDT, отправьте монеты на адрес указанный ниже.</p>
            <p className="text-sm text-red-600 font-semibold">
              Внимание: Курс обмена фиксируется на 15 минут с момента оформления заказа. По истечении этого времени курс может быть скорректирован.
            </p>
            <div className="bg-gray-100 p-4 rounded-md space-y-2">
              <p><span className="font-semibold">Сеть:</span> {depositInfo.network}</p>
              <p className="break-all"><span className="font-semibold">Адрес:</span>{" "}
                <span
                  className="text-blue-600 font-mono cursor-pointer hover:underline"
                  onClick={() => handleCopyAddress(depositInfo.address)}
                  title="Нажмите, чтобы скопировать"
                >
                  {depositInfo.address}
                </span>
              </p>
            </div>
            {deliveryMethodAfterSubmit === 'cash' && submittedDeliveryAddress && (
              <div className="bg-gray-100 p-4 rounded-md space-y-2">
                <p><span className="font-semibold">Способ получения:</span> Наличными (доставка)</p>
                <p><span className="font-semibold">Адрес доставки:</span> {submittedDeliveryAddress}</p>
                <p className="text-sm text-gray-600">
                  Наш курьер свяжется с вами в ближайшее время для подтверждения деталей доставки.
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              После отправки USDT, пожалуйста, свяжитесь с нами в Telegram для подтверждения транзакции.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-700 text-lg">
              Больше информации в Telegram
            </p>
            <a
              href="https://t.me/your_telegram_username" // Replace with actual Telegram link
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md"
            >
              <Send className="mr-2 h-5 w-5" />
              Написать в Telegram
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};