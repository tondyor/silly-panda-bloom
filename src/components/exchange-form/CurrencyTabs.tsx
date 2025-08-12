"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

interface CurrencyTabsProps {
  value: "USDT" | "RUB";
  onChange: (value: "USDT" | "RUB") => void;
}

export const CurrencyTabs: React.FC<CurrencyTabsProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <Tabs value={value} onValueChange={onChange} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-gray-200 p-1">
        <TabsTrigger
          value="USDT"
          className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-2 text-sm font-medium text-gray-700 transition-all"
        >
          {t("exchangeForm.usdt")}
        </TabsTrigger>
        <TabsTrigger
          value="RUB"
          className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-2 text-sm font-medium text-gray-700 transition-all"
        >
          {t("exchangeForm.rub")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};