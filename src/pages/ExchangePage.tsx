import React from "react";
import { ExchangeForm } from "@/components/ExchangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExchangeInfoSection } from "@/components/ExchangeInfoSection"; // Import the new component

const ExchangePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-6 lg:p-8
                    bg-gradient-to-br from-red-700 via-red-600 to-orange-500">
      {/* Background pattern for Vietnamese lantern style */}
      <div className="absolute inset-0 z-0 opacity-20"
           style={{
             backgroundImage: `radial-gradient(circle at 10% 20%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%),
                               radial-gradient(circle at 90% 80%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%),
                               repeating-radial-gradient(circle at center center, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 100px)`,
             backgroundSize: '100px 100px',
           }}>
      </div>

      <Card className="w-full max-w-lg mx-auto shadow-xl rounded-lg overflow-hidden relative z-10 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-6">
          <CardTitle className="text-4xl font-extrabold text-center mb-2 drop-shadow-md">
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