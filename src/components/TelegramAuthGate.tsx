import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';

// !!! ВАЖНО: Замените 'YOUR_BOT_NAME_HERE' на реальное имя вашего Telegram бота !!!
const BOT_USERNAME = "YOUR_BOT_NAME_HERE"; 

export const TelegramAuthGate = () => {
  const handleOpenTelegram = () => {
    window.location.href = `https://t.me/${BOT_USERNAME}`;
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4"
      style={{
        backgroundImage: "url('/vietnam-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/50 z-0"></div>
      <Card className="w-full max-w-md mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/80 backdrop-blur-sm border-4 border-white/60 text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Доступ через Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <p className="text-gray-600">
            Для использования нашего сервиса и создания заявок, пожалуйста, откройте приложение через нашего официального бота в Telegram.
          </p>
          <Button 
            onClick={handleOpenTelegram}
            className="w-full h-14 text-lg font-medium rounded-xl bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all duration-300 ease-in-out"
          >
            <Send className="mr-2 h-5 w-5" />
            Открыть в Telegram
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};