import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FastForward, Headphones } from 'lucide-react';

export const WhyChooseUsSection = () => {
  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60 mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-center text-blue-700">
          Почему выбирают VietSwap?
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-800">Выгодный курс:</h3>
            <p className="text-gray-600 text-sm">Мы предлагаем курс на 0.5% лучше официального курса Центробанка, чтобы вы получали максимум от каждого обмена.</p>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <FastForward className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-800">Быстрые транзакции:</h3>
            <p className="text-gray-600 text-sm">Наши процессы оптимизированы для мгновенного обмена, чтобы вы не ждали.</p>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Headphones className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-800">Надежная поддержка:</h3>
            <p className="text-gray-600 text-sm">Наша команда всегда готова помочь с любыми вопросами 24/7.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};