"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface ContactInputsProps {
  control: any;
}

export const ContactInputs: React.FC<ContactInputsProps> = ({ control }) => {
  const { t } = useTranslation();
  const inputClass = "h-12 p-3 text-base w-full min-w-[70%] bg-white";

  return (
    <>
      <FormField
        control={control}
        name="contactPhone"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel>{t("exchangeForm.phoneLabel")}</FormLabel>
            <FormControl className="w-full">
              <Input
                placeholder={t("exchangeForm.phonePlaceholder")}
                {...field}
                value={String(field.value ?? "")}
                className={inputClass}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};