import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExchangeSummary } from "@/components/ExchangeSummary";
import { WhyChooseUsSection } from "@/components/WhyChooseUsSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTelegram } from "@/hooks/useTelegram";
import { UserProfile } from "@/components/UserProfile";

const ExchangePage = () => {
  const { t } = useTranslation();
  const { data: telegramData, error: telegramError, isLoading: isTelegramLoading } = useTelegram();
  
  const [isSummaryView, setIsSummaryView] = useState(false);
  const [submittedOrderData, setSubmittedOrderData] = useState<any>(null);
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);

  const handleExchangeSuccess = (
    network: string,
    address: string,
    orderData: any,
  ) => {
    setDepositInfo({ network, address });

    const displayData = {
      order_id: orderData.order_id, // Correctly pass the order_id
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
    setIsSummaryView(true);
  };

  const renderContent = () => {
    if (isTelegramLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-gray-500" /></div>;
    }

    if (telegramError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{telegramError}</AlertDescription>
        </Alert>
      );
    }

    if (telegramData) {
      if (isSummaryView) {
        return (
          <ExchangeSummary data={submittedOrderData} depositInfo={depositInfo} />
        );
      }
      return <ExchangeForm initData={telegramData.initData} onExchangeSuccess={handleExchangeSuccess} />;
    }

    return null; // Это состояние не должно достигаться, если loading/error обработаны
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
      <div 
        className="absolute inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)' }}
      ></div>

      <div className="w-full max-w-lg flex justify-center items-center gap-x-4 mb-4 z-10 relative">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-[0_4px_5px_rgba(0,0,0,0.9)]">
          {t('headerTitle')}
        </h1>
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="flex flex-row items-center bg-gradient-to-r from-red-600 to-orange-500 text-white p-3">
          <UserProfile />
        </CardHeader>
        <CardContent className="px-4 py-6 sm:px-6 space-y-6">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Показываем эти секции только когда видна форма */}
      {!isSummaryView && telegramData && (
        <>
          <HowItWorksSection />
          <WhyChooseUsSection />
        </>
      )}

      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;