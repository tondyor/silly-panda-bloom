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
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Этот интерфейс должен соответствовать структуре, используемой в ExchangeForm
interface TelegramUser {
  telegram_id: number;
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
  const [isTelegramInitComplete, setIsTelegramInitComplete] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();

      // Получаем данные пользователя напрямую из Telegram Web App
      const unsafeUser = tg.initDataUnsafe?.user;

      if (unsafeUser) {
        // Преобразуем данные пользователя в наш интерфейс
        const currentUser: TelegramUser = {
          telegram_id: unsafeUser.id, // Сопоставляем `id` с `telegram_id`
          first_name: unsafeUser.first_name,
          last_name: unsafeUser.last_name,
          username: unsafeUser.username,
          language_code: unsafeUser.language_code,
        };
        setTelegramUser(currentUser);
        console.log("Пользователь Telegram инициализирован напрямую из WebApp:", currentUser);

        // Регистрируем/обновляем пользователя в базе данных в фоновом режиме
        supabase.functions.invoke("register-telegram-user", {
          body: { initData: tg.initData },
        }).then(({ error }) => {
          if (error) {
            console.error("Фоновая регистрация пользователя не удалась:", error.message);
          } else {
            console.log("Фоновая регистрация пользователя прошла успешно.");
          }
        });
      } else {
        console.warn("Данные пользователя Telegram не найдены в initDataUnsafe.");
      }
      
      // Отмечаем инициализацию как завершенную, чтобы форма могла отобразиться
      setIsTelegramInitComplete(true);
    } else {
      console.warn("Приложение запущено не в среде Telegram Web App. Пользователь Telegram будет null.");
      setIsTelegramInitComplete(true);
    }
  }, []);

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

    toast.success(t('notifications.exchangeSuccess.title'), {
      description: t('notifications.exchangeSuccess.description', {
        orderId: displayData.orderId,
        fromAmount: displayData.fromAmount,
        paymentCurrency: displayData.paymentCurrency,
        calculatedVND: displayData.calculatedVND.toLocaleString('vi-VN')
      }),
      duration: 5000,
      position: "top-center",
    });
  };

  if (!isTelegramInitComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

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

      <Card className="w-full max-w-lg mx-auto relative z-10 bg-white/75 backdrop-blur-sm border-2 border-white/60">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('headerTitle')}</CardTitle>
            <LanguageSwitcher />
          </div>
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