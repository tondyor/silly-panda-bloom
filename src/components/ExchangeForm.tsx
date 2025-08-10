"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  const form = useForm<{ amount: number }>({
    defaultValues: { amount: 0 },
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
    watch,
  } = form;

  const amount = watch("amount");

  const { data, isLoading: rateLoading } = useQuery<{ rate: number }>({
    queryKey: ["exchangeRate"],
    queryFn: () =>
      fetch(
        "https://lvrusgtopkuuuxgdzacf.supabase.co/functions/v1/get-exchange-rate",
        { method: "GET" }
      ).then((res) => res.json()),
    enabled: amount > 0,
    retry: false,
  });

  const rate = data?.rate ?? 0;
  const calculatedVND = rate * (amount || 0);

  const onSubmit = (values: { amount: number }) => {
    onExchangeSuccess(
      "USDT",
      "",
      {
        public_id: "",
        payment_currency: "USDT",
        from_amount: values.amount,
        calculated_vnd: calculatedVND,
        delivery_method: "",
        vnd_bank_name: null,
        vnd_bank_account_number: null,
        delivery_address: null,
        telegram_contact: "",
        contact_phone: null,
        usdt_network: "",
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("exchangeForm.amountLabel") || "Сумма USDT"}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder={t("exchangeForm.amountPlaceholder") || "0.00"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {amount > 0 && (
          <div className="flex items-center space-x-2">
            {rateLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-brand-blue" />
                <span>
                  {t("exchangeForm.loadingRate") || "Загрузка курса..."}
                </span>
              </>
            ) : (
              <span>
                {t("exchangeForm.youReceive") || "Вы получите"}{" "}
                <strong>
                  {calculatedVND.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </strong>
              </span>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-14 text-lg font-bold rounded-xl bg-brand-blue text-white shadow-lg hover:bg-brand-accent focus-visible:ring-2 focus-visible:ring-brand-accent disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={isSubmitting || rateLoading || !(amount > 0)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
              {t("exchangeForm.processingButton")}
            </>
          ) : (
            t("exchangeForm.exchangeNowButton")
          )}
        </Button>
      </form>
    </Form>
  );
}