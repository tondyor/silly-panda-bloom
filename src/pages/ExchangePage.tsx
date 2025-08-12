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

interface TelegramUser {
  telegram_id: number; // Используем telegram_id, как в вашей таблице
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
      const initTelegramUser = async () => {
        try {
          // Вызываем Edge Function для регистрации/обновления пользователя Telegram
          const { data, error } = await supabase.functions.invoke("register-telegram-user", {
            body: { initData: tg.initData },
          });

          if (error) {
            console.error("Error invoking register-telegram-user function:", error);
            // Если вызов функции не удался, пользовательские данные могут быть недоступны
            // telegramUser останется null в этом случае.
          } else if (data && data.user) {
            // Если успешно, устанавливаем состояние telegramUser данными, возвращенными из Edge Function
            setTelegramUser(data.user);
            console.log("Telegram user initialized from DB:", data.user);
          } else {
            console.warn("register-telegram-user function returned no user data.");
          }
        } catch (err) {
          console.error("Network error during Telegram user initialization:", err);
        } finally {
          setIsTelegramInitComplete(true);
        }
      };

      initTelegramUser();
    } else {
      // Если не в среде Telegram Web App, считаем инициализацию завершенной, но без пользователя Telegram
      console.warn("Not running in Telegram Web App environment. Telegram user will be null.");
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

    toast.success("Ваш запрос на обмен успешно отправлен!", {
      description: `Номер вашего заказа: ${displayData.orderId}. Вы обменяли ${displayData.fromAmount} ${displayData.paymentCurrency} на ${displayData.calculatedVND.toLocaleString('vi-VN')} VND.`,
      duration: 3000,
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