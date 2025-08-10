"use client";

import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const ExchangePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader
          className="relative bg-white p-4 border-b-4 border-[#D94F00] flex items-center justify-center"
          style={{ backgroundColor: "#D94F00" }} // Using a color matching the logo's main color for edges
        >
          {/* Assuming logo is inside here */}
          <div className="w-full flex justify-center">
            {/* Logo should be fully visible, no cropping */}
            <img
              src="/logo.svg"
              alt="Logo"
              className="max-h-12 object-contain"
              style={{ backgroundColor: "#D94F00" }}
            />
          </div>
          <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20">
            <LanguageSwitcher />
          </div>
        </CardHeader>
        {/* ...rest of the card content */}
      </Card>
    </div>
  );
};

export default ExchangePage;