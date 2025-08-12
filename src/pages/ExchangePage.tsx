import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PostSubmissionInfo } from "@/components/PostSubmissionInfo";
import { ExchangeSummary } from "@/components/ExchangeSummary";
import { WhyChooseUsSection } from "@/components/WhyChooseUsSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TelegramAuthGate } from "@/components/TelegramAuthGate";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Импортируем supabase клиент

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

const ExchangePage = () => {
  const { t } = useTranslation();
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submittedFormData, setSubmittedFormData] = useState<any>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      // Попытка получить user из initDataUnsafe
      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user);
      }

      // Отправляем initData на сервер для регистрации пользователя
      const registerUser = async () => {
        try {
          const { data, error } = await supabase.functions.invoke("register-telegram-user", {
            body: { initData: tg.initData },
          });

          if (error) {
            console.error("Error registering Telegram user on server:", error);
            // Можно показать тост пользователю, если регистрация не удалась
            toast.error("Не удалось зарегистрировать пользователя на сервере. Попробуйте позже.", { duration: 5000 });
          } else {
            console.log("Telegram user registered/updated on server:", data);
            // Если telegramUser не был установлен из initDataUnsafe, но сервер вернул данные, используем их
            if (!telegramUser && data?.user) {
              setTelegramUser(data.user);
            }
          }
        } catch (err) {
          console.error("Network error during Telegram user registration:", err);
          toast.error("Ошибка сети при регистрации пользователя.", { duration: 5000 });
        } finally {
          setIsLoading(false); // Завершаем загрузку после попытки регистрации
        }
      };

      registerUser();
    } else {
      setIsLoading(false); // Если не в Telegram, сразу завершаем загрузку
    }
  }, []); // Пустой массив зависимостей, чтобы эффект запускался только один раз

  const handleExchangeSuccess = (
    network: string,
    address: string,
    orderData: any,
  ) => {
    setDepositInfo({ network, address });

    const displayData = {
      orderId: orderData.public_id,
      paymentCurrency: orderData.payment_currency,
      fromAmount: orderData.from_amount,
      calculatedVND: orderData.calculated_vnd,
      deliveryMethod: orderData.delivery_method,
      vndBankName: orderData.vnd_bank_name,
      vndBankAccountNumber: orderData.vnd_bank_account_number,
      deliveryAddress: orderData.delivery_address,
      contactPhone: orderData.contact_phone,
      usdtNetwork: orderData.usdt_network,
    };

    setSubmittedFormData(displayData);
    setIsFormSubmitted(true);

    toast.success("Ваш запрос на обмен успешно отправлен!", {
      description: `Номер вашего заказа: ${displayData.orderId}. Вы обменяли ${displayData.fromAmount} ${displayData.paymentCurrency} на ${displayData.calculatedVND.toLocaleString('vi-VN')} VND.`,
      duration: 3000,
      position: "top-center",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

  // Строгая проверка: если объект пользователя не был получен, показываем заглушку.
  if (!telegramUser) {
    return <TelegramAuthGate />;
  }

  // Если мы здесь, значит telegramUser гарантированно существует.
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-2 sm:p-4 lg:p-6"
      style={{
        backgroundImage: "url('/vietnam-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/30 z-0"></div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="relative bg-gradient-to-r from-red-600 to-orange-500 text-white p-4">
          <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20">
            <LanguageSwitcher />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-extrabold text-center text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            {t('headerTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-6 sm:px-6 space-y-6">
          {isFormSubmitted ? (
            <>
              <ExchangeSummary data={submittedFormData} />
              <PostSubmissionInfo depositInfo={depositInfo} formData={submittedFormData} />
            </>
          ) : (
            <ExchangeForm onExchangeSuccess={handleExchangeSuccess} telegramUser={telegramUser} />
          )}
        </CardContent>
      </Card>

      {!isFormSubmitted && (
        <>
          <WhyChooseUsSection />
          <HowItWorksSection />
        </>
      )}

      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;