import React, { useState } from "react";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExchangeInfoSection } from "@/components/ExchangeInfoSection";
import { ExchangeSummary } from "@/components/ExchangeSummary"; // Import the new summary component
import { BankLogosSection } from "@/components/BankLogosSection"; // Import the new BankLogosSection
import { toast } from "sonner"; // Import toast from sonner

const ExchangePage = () => {
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);
  const [deliveryMethodAfterSubmit, setDeliveryMethodAfterSubmit] = useState<'bank' | 'cash' | null>(null);
  const [submittedDeliveryAddress, setSubmittedDeliveryAddress] = useState<string | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [submittedFormData, setSubmittedFormData] = useState<any>(null); // To store all submitted data
  const [orderCounter, setOrderCounter] = useState<number>(564); // Начинаем счет с 564

  // Helper function to convert number to AAA, AAB, ...
  const getAlphabeticalPrefix = (index: number): string => {
    let result = '';
    let tempIndex = index;
    for (let i = 0; i < 3; i++) { // For a 3-letter prefix
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
    formData: any, // Receive all form data
    loadingToastId: string // Receive the ID of the loading toast
  ) => {
    // Calculate the alphabetical index based on the starting counter
    const alphabeticalIndex = orderCounter - 564; // 564 -> 0, 565 -> 1, etc.
    const prefix = getAlphabeticalPrefix(alphabeticalIndex);
    const currentOrderId = `${prefix}${orderCounter}`; // Генерируем номер заказа

    setOrderCounter(prevCounter => prevCounter + 1); // Увеличиваем счетчик для следующего заказа

    setDepositInfo({ network, address });
    setDeliveryMethodAfterSubmit(method);
    setSubmittedDeliveryAddress(formData.deliveryMethod === 'cash' ? formData.deliveryAddress : null);
    setSubmittedFormData({ ...formData, orderId: currentOrderId }); // Store all submitted data including orderId
    setIsFormSubmitted(true); // Set form as submitted

    // Handle success toast after 3 seconds
    setTimeout(() => {
      toast.dismiss(loadingToastId); // Dismiss the loading toast
      toast.success("Ваш запрос на обмен успешно отправлен!", {
        description: `Номер вашего заказа: ${currentOrderId}. Вы обменяли ${formData.usdtAmount} USDT на ${formData.calculatedVND.toLocaleString('vi-VN')} VND.`,
        duration: 10000, // Toast disappears after 10 seconds
      });
    }, 3000); // Delay for 3 seconds
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage: `url('/images/background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // Makes the background fixed while scrolling
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
      
      <ExchangeInfoSection 
        depositInfo={depositInfo} 
        deliveryMethodAfterSubmit={deliveryMethodAfterSubmit}
        submittedDeliveryAddress={submittedDeliveryAddress}
      />
      <BankLogosSection /> {/* Add the new BankLogosSection here */}
      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;