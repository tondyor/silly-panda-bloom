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
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

const BlockerScreen = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <Card className="bg-gray-800 border-red-500 border-2 max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-red-400 flex items-center justify-center gap-2">
            <AlertTriangle /> {t("blocker.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{t("blocker.description")}</p>
          <Button
            onClick={() => {
              // Здесь можно указать реальное имя вашего бота
              window.open("https://t.me/your_bot_username", "_blank");
            }}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {t("blocker.button")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const ExchangePage = () => {
  const { t } = useTranslation();
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submittedFormData, setSubmittedFormData] = useState<any>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isTelegramReady, setIsTelegramReady] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [initData, setInitData] = useState<string>("");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg || Object.keys(tg).length === 0) {
      console.error("Telegram Web App environment not found. Blocking access.");
      setIsBlocked(true);
      return;
    }

    tg.ready();
    tg.expand();

    const unsafeUser = tg.initDataUnsafe?.user;

    if (unsafeUser) {
      setTelegramUser(unsafeUser);
      setInitData(tg.initData);
      console.log("Telegram user initialized:", unsafeUser);

      // Запрос права на отправку сообщений
      tg.requestWriteAccess((isAllowed) => {
        console.log(`Permission to write to PM: ${isAllowed}`);
        // Верифицируем сессию на бэкенде
        fetch("https://lvrusgtopkuuuxgdzacf.supabase.co/functions/v1/verify-telegram-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData, allowsWriteToPm: isAllowed }),
        })
          .then(res => res.json())
          .then(data => {
            if (!data.ok) throw new Error(data.error || "Session verification failed");
            console.log("Session verified successfully.");
          })
          .catch(err => console.error("Failed to verify session:", err));
      });
    } else {
      console.error("User data not found in initDataUnsafe. Blocking access.");
      setIsBlocked(true);
      return;
    }

    setIsTelegramReady(true);
  }, []);

  const handleExchangeSuccess = (orderData: any) => {
    const displayData = {
      orderId: orderData.order_id,
      status: orderData.status,
      ...orderData.original_data, // Предполагаем, что бэк вернет исходные данные формы
    };

    setSubmittedFormData(displayData);
    setIsFormSubmitted(true);

    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    toast.success("Ваш запрос на обмен успешно отправлен!", {
      description: `Номер вашего заказа: ${displayData.orderId}.`,
      duration: 5000,
      position: "top-center",
    });

    // Если боту нужно разрешение на отправку, а его нет
    if (orderData.notification_status?.need_start) {
      toast.warning("Нажмите 'Start' в чате с ботом, чтобы получать уведомления.", {
        duration: 10000,
        action: {
          label: "Открыть чат",
          onClick: () => window.open("https://t.me/your_bot_username?start=1", "_blank"),
        },
      });
    }
  };

  if (isBlocked) {
    return <BlockerScreen />;
  }

  if (!isTelegramReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
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
              <PostSubmissionInfo
                depositInfo={{
                  network: submittedFormData.usdtNetwork,
                  address: "N/A", // Адрес теперь приходит от бэка или известен заранее
                }}
                formData={submittedFormData}
              />
            </>
          ) : (
            <ExchangeForm
              onExchangeSuccess={handleExchangeSuccess}
              telegramUser={telegramUser}
              initData={initData}
            />
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