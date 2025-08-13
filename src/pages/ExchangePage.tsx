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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ExchangePage = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<'loading' | 'error' | 'form' | 'summary'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [initData, setInitData] = useState<string>('');
  
  const [submittedOrderData, setSubmittedOrderData] = useState<any>(null);
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();

      // Строгая проверка initData
      if (tg.initData && tg.initData.length > 0) {
        setInitData(tg.initData);
        setView('form');
      } else {
        setErrorMessage("Ошибка: приложение должно быть запущено из Telegram.");
        setView('error');
      }
    } else {
      // Для отладки в браузере или если скрипт не загрузился
      console.warn("Telegram Web App script not found. Running in non-Telegram environment.");
      setErrorMessage("Ошибка: не удалось подключиться к Telegram. Это приложение предназначено для использования только внутри Telegram.");
      setView('error');
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

    setSubmittedOrderData(displayData);
    setView('summary');

    toast.success("Заявка отправлена!", {
      description: `Детали заказа отправлены вам в личном сообщении.`,
      duration: 5000,
    });
  };

  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-gray-500" /></div>;
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        );
      case 'form':
        // Передаем initData как обязательный проп
        return <ExchangeForm initData={initData} onExchangeSuccess={handleExchangeSuccess} />;
      case 'summary':
        return (
          <>
            <ExchangeSummary data={submittedOrderData} />
            <PostSubmissionInfo depositInfo={depositInfo} formData={submittedOrderData} />
          </>
        );
      default:
        return null;
    }
  };

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
          {renderContent()}
        </CardContent>
      </Card>

      {view === 'form' && (
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