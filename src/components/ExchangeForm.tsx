"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export interface ExchangeFormProps {
  onExchangeSuccess: (
    network: string,
    address: string,
    orderData: any
  ) => void;
}

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const { t } = useTranslation();
  const form = useForm<any>();
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isUsdtRateUnavailable, setIsUsdtRateUnavailable] = useState(false);
  const [paymentCurrency] = useState<string>("USDT"); // placeholder

  const onSubmit = (data: any) => {
    // placeholder logic
    onExchangeSuccess("USDT", "addr", data);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ... остальные поля */}
        <Button
          type="submit"
          className="w-full h-14 text-lg font-bold rounded-xl bg-brand-blue text-white shadow-lg hover:bg-brand-accent focus-visible:ring-2 focus-visible:ring-brand-accent disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={isSubmitting || isUsdtRateUnavailable}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
              {t("exchangeForm.processingButton")}
            </>
          ) : isLoadingRate && paymentCurrency === "USDT" ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
              {t("exchangeForm.loadingRateButton")}
            </>
          ) : (
            t("exchangeForm.exchangeNowButton")
          )}
        </Button>
      </form>
    </Form>
  );
}