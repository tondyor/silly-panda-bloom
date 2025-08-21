"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Landmark, HandCoins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface DeliveryMethodTabsProps {
  value: "bank" | "cash";
  onChange: (value: "bank" | "cash") => void;
  paymentCurrency: string;
  control: any;
}

export const DeliveryMethodTabs: React.FC<DeliveryMethodTabsProps> = ({
  value,
  onChange,
  paymentCurrency,
  control,
}) => {
  const { t } = useTranslation();
  const inputClass = "h-12 p-3 text-base w-full min-w-[70%]";

  return (
    <div className="space-y-1">
      <FormLabel>
        {t("exchangeForm.deliveryMethodLabel")} <span className="text-red-500">*</span>
      </FormLabel>
      <Tabs value={value} onValueChange={onChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-gray-200 p-1">
          <TabsTrigger
            value="bank"
            disabled={paymentCurrency === "RUB"}
            className="flex h-auto flex-col items-center justify-center gap-1 rounded-md p-3 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Landmark className="h-5 w-5" />
            <span className="text-sm font-medium">{t("exchangeForm.bankAccount")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="cash"
            className="flex h-auto flex-col items-center justify-center gap-1 rounded-md p-3 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <HandCoins className="h-5 w-5" />
            <span className="text-sm font-medium">{t("exchangeForm.cash")}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bank" className="mt-2 space-y-2">
          <FormField
            control={control}
            name="vndBankAccountNumber"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>
                  {t("exchangeForm.bankAccountNumberLabel")} <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl className="w-full">
                  <Input
                    placeholder={t("exchangeForm.bankAccountNumberPlaceholder")}
                    {...field}
                    value={String(field.value ?? "")}
                    className={inputClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="vndBankName"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>
                  {t("exchangeForm.bankNameLabel")} <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl className="w-full">
                  <Input
                    placeholder={t("exchangeForm.bankNamePlaceholder")}
                    {...field}
                    value={String(field.value ?? "")}
                    className={inputClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
        <TabsContent value="cash" className="mt-2 space-y-2">
          <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
            {t("exchangeForm.cashDeliveryInfo")}
          </p>
          <FormField
            control={control}
            name="deliveryAddress"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>
                  {t("exchangeForm.deliveryAddressLabel")} <span className="text-red-500">*</span>
                  <span className="block text-xs text-gray-500 font-normal mt-1">
                    {t("exchangeForm.deliveryAddressDescription")}
                  </span>
                </FormLabel>
                <FormControl className="w-full">
                  <Input
                    placeholder={t("exchangeForm.deliveryAddressPlaceholder")}
                    {...field}
                    className={inputClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};