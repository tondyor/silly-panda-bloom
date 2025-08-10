import React, { useState } from 'react';
import { ExchangeForm } from '@/components/ExchangeForm';
import { ExchangeSummary } from '@/components/ExchangeSummary';
import { PostSubmissionInfo } from '@/components/PostSubmissionInfo';
import { WhyChooseUsSection } from '@/components/WhyChooseUsSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type View = 'form' | 'summary' | 'post-submission';

const ExchangePage = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('form');
  const [orderData, setOrderData] = useState<any>(null);
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);

  const handleExchangeSuccess = (network: string, address: string, newOrder: any) => {
    const fullOrderData = {
      ...newOrder,
      orderId: newOrder.public_id,
      paymentCurrency: newOrder.payment_currency,
      fromAmount: newOrder.from_amount,
      calculatedVND: newOrder.calculated_vnd,
      deliveryMethod: newOrder.delivery_method,
      vndBankName: newOrder.vnd_bank_name,
      vndBankAccountNumber: newOrder.vnd_bank_account_number,
      deliveryAddress: newOrder.delivery_address,
      telegramContact: newOrder.telegram_contact,
      contactPhone: newOrder.contact_phone,
      usdtNetwork: newOrder.usdt_network,
    };
    setOrderData(fullOrderData);
    setDepositInfo({ network, address });
    setView('summary');
  };

  const handleConfirmSummary = () => {
    setView('post-submission');
  };

  const handleGoBack = () => {
    setView('form');
    setOrderData(null);
    setDepositInfo(null);
  };

  const renderContent = () => {
    switch (view) {
      case 'summary':
        return (
          <>
            <ExchangeSummary data={orderData} />
            <Button onClick={handleConfirmSummary} className="w-full mt-4 bg-green-600 hover:bg-green-700">
              {t('exchangePage.confirmAndProceed')}
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="w-full mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('exchangePage.backToForm')}
            </Button>
          </>
        );
      case 'post-submission':
        return (
          <>
            <PostSubmissionInfo depositInfo={depositInfo} formData={orderData} />
            <Button onClick={handleGoBack} className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('exchangePage.newExchange')}
            </Button>
          </>
        );
      case 'form':
      default:
        return <ExchangeForm onExchangeSuccess={handleExchangeSuccess} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-start p-4 font-sans text-white">
      <div className="w-full max-w-lg mx-auto">
        <Card className="w-full shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-black/50 backdrop-blur-sm border-2 border-white/10">
          <CardHeader className="relative p-0">
            <img src="/logo.jpg" alt="Logo" className="w-full h-auto" />
            <div className="absolute top-2 right-2 z-10">
              <LanguageSwitcher />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>
        
        {view === 'form' && (
          <>
            <WhyChooseUsSection />
            <HowItWorksSection />
          </>
        )}
      </div>
    </div>
  );
};

export default ExchangePage;