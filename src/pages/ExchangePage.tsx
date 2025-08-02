import React, { useState } from "react";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExchangeInfoSection } from "@/components/ExchangeInfoSection";

const ExchangePage = () => {
  const [depositInfo, setDepositInfo] = useState<{ network: string; address: string; } | null>(null);

  const handleExchangeSuccess = (network: string, address: string) => {
    setDepositInfo({ network, address });
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
          <ExchangeForm onExchangeSuccess={handleExchangeSuccess} />
        </CardContent>
      </Card>
      
      <ExchangeInfoSection depositInfo={depositInfo} />
      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;