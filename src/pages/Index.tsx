import React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 via-yellow-100 to-green-100">
    <h1 className="text-4xl font-bold mb-4 text-blue-700">Добро пожаловать на VietSwap!</h1>
    <p className="text-lg text-gray-700 mb-8">
      Моментальный обмен USDT на VND — быстро, выгодно, удобно.
    </p>
    <MadeWithDyad />
  </div>
);

export default Index;