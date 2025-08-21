"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UsdtNetworkSelectProps {
  control: any;
  name: string;
}

export const UsdtNetworkSelect: React.FC<UsdtNetworkSelectProps> = ({ control, name }) => {
  const { t } = useTranslation();
  const inputClass = "h-12 p-3 text-base w-full min-w-[70%] bg-white";

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>
            {t("exchangeForm.usdtNetworkLabel")} <span className="text-red-500">*</span>
          </FormLabel>
          <FormControl className="w-full">
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder={t("exchangeForm.selectNetworkPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BEP20">BSC (BEP20)</SelectItem>
                <SelectItem value="TRC20">TRX (TRC20)</SelectItem>
                <SelectItem value="ERC20">ETH (ERC20)</SelectItem>
                <SelectItem value="TON">TON (TON)</SelectItem>
                <SelectItem value="SPL">SOL (SPL)</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};