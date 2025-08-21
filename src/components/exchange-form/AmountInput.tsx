"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface AmountInputProps {
  control: any;
  name: string;
  currency: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({ control, name, currency }) => {
  const { t } = useTranslation();
  const inputClass = "h-12 p-3 text-base w-full min-w-[70%] text-lg bg-white";

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>
            {t("exchangeForm.amountLabel", { currency })} <span className="text-red-500">*</span>
          </FormLabel>
          <FormControl className="w-full">
            <Input
              type="text"
              inputMode="decimal"
              placeholder={t("exchangeForm.amountPlaceholder", { currency })}
              {...field}
              value={field.value === undefined ? "" : String(field.value)}
              onChange={(e) => {
                const val = e.target.value;
                const numericValue = val.replace(/[^0-9]/g, "");
                field.onChange(numericValue === "" ? undefined : Number(numericValue));
              }}
              className={inputClass}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};