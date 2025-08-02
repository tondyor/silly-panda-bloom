import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bankLogos = [
  { name: "Tether", src: "/images/banks/tether.png" },
  { name: "Vietcombank", src: "/images/banks/vietcombank.png" },
  { name: "Techcombank", src: "/images/banks/techcombank.png" },
  { name: "BIDV", src: "/images/banks/bidv.png" },
  { name: "Agribank", src: "/images/banks/agribank.png" },
  { name: "MB Bank", src: "/images/banks/mb-bank.png" },
  { name: "VPBank", src: "/images/banks/vpbank.png" },
  { name: "Sacombank", src: "/images/banks/sacombank.png" },
  { name: "ACB", src: "/images/banks/acb.png" },
  { name: "VietinBank", src: "/images/banks/vietinbank.png" },
];

export const BankLogosSection = () => {
  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60 mt-6">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4">
        <CardTitle className="text-2xl font-bold text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          Мы работаем с
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 justify-items-center items-center">
        {bankLogos.map((logo) => (
          <div key={logo.name} className="flex flex-col items-center justify-center p-2">
            <img
              src={logo.src}
              alt={logo.name}
              className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-110"
              style={{ filter: 'grayscale(100%) brightness(1.2)' }} // Optional: grayscale for a unified look
            />
            {/* <p className="text-xs text-gray-600 mt-1 text-center">{logo.name}</p> */}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};