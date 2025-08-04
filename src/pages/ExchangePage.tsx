import React, { useState } from "react";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExchangeInfoSection } from "@/components/ExchangeInfoSection";
import { ExchangeSummary } from "@/components/ExchangeSummary";
import { WhyChooseUsSection } from "@/components/WhyChooseUsSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { toast } from "sonner";

const ExchangePage = () => {
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);
  const [deliveryMethodAfterSubmit, setDeliveryMethodAfterSubmit] = useState<'bank' | 'cash' | null>(null);
  const [submittedDeliveryAddress, setSubmittedDeliveryAddress] = useState<string | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submittedFormData, setSubmittedFormData] = useState<any>(null);
  const [orderCounter, setOrderCounter] = useState<number>(564);

  const getAlphabeticalPrefix = (index: number): string => {
    let result = '';
    let tempIndex = index;
    for (let i = 0; i < 3; i++) {
      const charCode = 'A'.charCodeAt(0) + (tempIndex % 26);
      result = String.fromCharCode(charCode) + result;
      tempIndex = Math.floor(tempIndex / 26);
    }
    return result;
  };

  const handleExchangeSuccess = (
    network: string,
    address: string,
    method: 'bank' | 'cash',
    formData: any,
    loadingToastId: string
  ) => {
    const alphabeticalIndex = orderCounter - 564;
    const prefix = getAlphabeticalPrefix(alphabeticalIndex);
    const currentOrderId = `${prefix}${orderCounter}`;

    setOrderCounter(prevCounter => prevCounter + 1);

    setDepositInfo({ network, address });
    setDeliveryMethodAfterSubmit(method);
    setSubmittedDeliveryAddress(formData.deliveryMethod === 'cash' ? formData.deliveryAddress : null);
    setSubmittedFormData({ ...formData, orderId: currentOrderId });
    setIsFormSubmitted(true);

    setTimeout(() => {
      toast.dismiss(loadingToastId);
      toast.success("Ваш запрос на обмен успешно отправлен!", {
        description: `Номер вашего заказа: ${currentOrderId}. Вы обменяли ${formData.usdtAmount} USDT на ${formData.calculatedVND.toLocaleString('vi-VN')} VND.`,
        duration: 10000,
      });
    }, 3000);
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage: `url('/images/background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay for better readability of content */}
      <div className="absolute inset-0 bg-black opacity-40 z-0"></div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-6">
          <CardTitle className="text-4xl font-extrabold text-center mb-2 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            VietSwap
          </CardTitle>
          <CardDescription className="text-red-100 text-center text-lg mt-2">
            Ваш быстрый и выгодный обмен USDT на VND
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {isFormSubmitted ? (
            <ExchangeSummary data={submittedFormData} />
          ) : (
            <ExchangeForm onExchangeSuccess={handleExchangeSuccess} />
          )}
        </CardContent>
      </Card>
      
      <div className="w-full max-w-lg mx-auto space-y-6 mt-6 relative z-10">
        {!isFormSubmitted && (
          <>
            <WhyChooseUsSection />
            <HowItWorksSection />
          </>
        )}
        <ExchangeInfoSection 
          depositInfo={depositInfo} 
          deliveryMethodAfterSubmit={deliveryMethodAfterSubmit}
          submittedDeliveryAddress={submittedDeliveryAddress}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;