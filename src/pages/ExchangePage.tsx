"use client";

import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
// Изменено: теперь логотип загружается из папки public
// Убедитесь, что вы поместили файл LOGO.jpg в папку public
import logo from "/LOGO.jpg"; 

const ExchangePage = () => {
  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
      <CardHeader className="relative bg-white p-4 flex justify-center items-center">
        <img src={logo} alt="Viet Swap Logo" className="w-full h-auto object-contain" />
        <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20">
          <LanguageSwitcher className="text-blue-600" />
        </div>
      </CardHeader>
      {/* ...rest of the component */}
    </Card>
  );
};

export default ExchangePage;