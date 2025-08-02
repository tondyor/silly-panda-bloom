import React from "react";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExchangeInfoSection } from "@/components/ExchangeInfoSection"; // Import the new component

const ExchangePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-6 lg:p-8
                    bg-gradient-to-br from-red-700 via-red-600 to-orange-500">
      {/* Background pattern for Vietnamese lantern style, enhanced for Hoi An feel */}
      <div className="absolute inset-0 z-0 opacity-30"
           style={{
             backgroundImage: `radial-gradient(circle at 15% 25%, rgba(255,220,150,0.15) 0%, rgba(255,220,150,0) 70%),
                               radial-gradient(circle at 85% 75%, rgba(255,220,150,0.15) 0%, rgba(255,220,150,0) 70%),
                               repeating-radial-gradient(circle at center center, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 120px)`,
             backgroundSize: '120px 120px',
           }}>
      </div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/95 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-6">
          <CardTitle className="text-4xl font-extrabold text-center mb-2 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            VietSwap
          </CardTitle>
          <CardDescription className="text-red-100 text-center text-lg mt-2">
            Ваш быстрый и выгодный обмен USDT на VND
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-center text-lg font-semibold text-gray-700">
            <p className="mb-2">
              Получите на <span className="text-green-600 font-bold">0.5% больше</span>, чем по официальному курсу!
            </p>
            <p className="text-sm text-gray-500">
              Мы предлагаем самый выгодный курс для вашего обмена.
            </p>
          </div>
          <ExchangeForm />
        </CardContent>
      </Card>
      
      <ExchangeInfoSection /> {/* Add the new info section here */}
      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;