"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import CountdownCircle from "./CountdownCircle";
import { CurrencyTabs, AmountInput, UsdtNetworkSelect, DeliveryMethodTabs, ContactInputs } from "./exchange-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const PROFIT_MARGIN = -0.02;

const commonFields = {
  paymentCurrency: z.enum(["USDT", "RUB"]),
  fromAmount: z.number({ invalid_type_error: "Сумма должна быть числом." }).optional(),
  usdtNetwork: z.enum(["BEP20", "TRC20", "ERC20", "TON", "SPL"]).optional(),
  contactPhone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => val === undefined || val === "" || /^\+?\d{10,15}$/.test(val),
      "Неверный формат номера телефона.",
    ),
};

const formSchema = z.discriminatedUnion("deliveryMethod", [
  z.object({
    deliveryMethod: z.literal("bank"),
    ...commonFields,
    vndBankAccountNumber: z
      .string()
      .min(8, "Номер счета должен содержать не менее 8 символов.")
      .max(20, "Номер счета должен содержать не более 20 символов.")
      .regex(/^\d+$/, "Номер счета должен содержать только цифры."),
    vndBankName: z
      .string()
      .min(2, "Название банка должно содержать не менее 2 символов.")
      .max(50, "Название банка должно содержать не более 50 символов."),
  }),
  z.object({
    deliveryMethod: z.literal("cash"),
    ...commonFields,
    deliveryAddress: z
      .string()
      .min(10, "Адрес доставки должен быть подробным.")
      .max(200, "Адрес доставки слишком длинный."),
  }),
]).superRefine((data, ctx) => {
  if (data.fromAmount === undefined || data.fromAmount === null || isNaN(data.fromAmount)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Пожалуйста, введите сумму.", path: ["fromAmount"] });
    return;
  }
  if (data.paymentCurrency === "USDT") {
    if (!data.usdtNetwork) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Пожалуйста, выберите сеть USDT.", path: ["usdtNetwork"] });
    }
    if (data.fromAmount < 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Минимальная сумма обмена 100 USDT.", path: ["fromAmount"] });
    }
    if (data.fromAmount > 100000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Максимальная сумма обмена 100,000 USDT.", path: ["fromAmount"] });
    }
  } else if (data.paymentCurrency === "RUB") {
    if (data.deliveryMethod !== "cash") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Для обмена рублей доступна только доставка наличными.", path: ["deliveryMethod"] });
    }
    if (data.fromAmount < 10000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Минимальная сумма обмена 10,000 RUB.", path: ["fromAmount"] });
    }
    if (data.fromAmount > 1000000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Максимальная сумма обмена 1,000,000 RUB.", path: ["fromAmount"] });
    }
  }
});

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function fetchUsdtVndRates(): Promise<number[]> {
  const results: number[] = [];
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd");
    if (res.ok) {
      const data = await res.json();
      if (data?.tether?.vnd) results.push(data.tether.vnd);
    }
  } catch (e) { console.error(e); }
  return results;
}

async function fetchRubVndRates(): Promise<number[]> {
  const results: number[] = [];
  try {
    const res = await fetch("https://api.exchangerate.host/convert?from=RUB&to=VND");
    if (res.ok) {
      const data = await res.json();
      if (data?.result) results.push(data.result);
    }
  } catch (e) { console.error(e); }
  return results;
}

const fetchExchangeRate = async (currency: "USDT" | "RUB"): Promise<number> => {
  const rates = currency === "USDT" ? await fetchUsdtVndRates() : await fetchRubVndRates();
  if (rates.length === 0) return currency === "USDT" ? 24000 : 300;
  const avgRate = average(rates);
  return avgRate * (1 + PROFIT_MARGIN);
};

interface TelegramUser {
  id: number;
  first_name: string;
}

export interface ExchangeFormProps {
  onExchangeSuccess: (orderData: any) => void;
  telegramUser: TelegramUser | null;
  initData: string;
}

export function ExchangeForm({ onExchangeSuccess, telegramUser, initData }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: usdtVndRate,
    isLoading: isLoadingRate,
    isError: isErrorRate,
    dataUpdatedAt: usdtDataUpdatedAt,
  } = useQuery<number>({
    queryKey: ["usdt-vnd-rate"],
    queryFn: () => fetchExchangeRate("USDT"),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const { data: rubVndRate, dataUpdatedAt: rubDataUpdatedAt } = useQuery<number>({
    queryKey: ["rub-vnd-rate"],
    queryFn: () => fetchExchangeRate("RUB"),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentCurrency: "USDT",
      deliveryMethod: "bank",
      usdtNetwork: "TRC20",
      fromAmount: 100,
    },
  });

  const fromAmount = form.watch("fromAmount");
  const deliveryMethod = form.watch("deliveryMethod");
  const paymentCurrency = form.watch("paymentCurrency");

  useEffect(() => {
    const preciseRate = paymentCurrency === "USDT" ? usdtVndRate ?? 0 : rubVndRate ?? 0;
    setExchangeRate(preciseRate);
    const displayRate = Math.round(preciseRate);
    if (typeof fromAmount === "number" && fromAmount > 0) {
      setCalculatedVND(fromAmount * displayRate);
    } else {
      setCalculatedVND(0);
    }
  }, [fromAmount, paymentCurrency, usdtVndRate, rubVndRate]);

  const handleCurrencyChange = (value: "USDT" | "RUB") => {
    form.setValue("paymentCurrency", value);
    if (value === "RUB") form.setValue("deliveryMethod", "cash");
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!initData) {
      setErrorMessage("Ошибка: initData отсутствует. Невозможно создать заказ.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    const orderPayload = {
      ...values,
      calculatedVND,
      exchangeRate,
    };

    try {
      const res = await fetch("https://lvrusgtopkuuuxgdzacf.supabase.co/functions/v1/create-telegram-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, order: orderPayload }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.error || "Не удалось создать заказ.");
      }
      
      onExchangeSuccess({ ...result, original_data: values });
      form.reset();
      setCalculatedVND(0);

    } catch (error: any) {
      console.error("Error submitting exchange:", error);
      setErrorMessage(error.message);
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRateUnavailable = (paymentCurrency === "USDT" && (isLoadingRate || isErrorRate || !usdtVndRate)) ||
                            (paymentCurrency === "RUB" && !rubVndRate);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1">
          <Label>{t("exchangeForm.exchangeCurrencyLabel")} <span className="text-red-500">*</span></Label>
          <CurrencyTabs value={paymentCurrency} onChange={handleCurrencyChange} />
          <div className="flex h-8 items-center justify-center gap-2 text-sm text-gray-600">
            {isLoadingRate && paymentCurrency === 'USDT' ? <Skeleton className="h-4 w-48" /> :
             !isRateUnavailable && (
              <>
                <span>1 {paymentCurrency} / {Math.round(exchangeRate).toLocaleString("vi-VN")} VND</span>
                <CountdownCircle key={paymentCurrency === 'USDT' ? usdtDataUpdatedAt : rubDataUpdatedAt} duration={30} />
              </>
            )}
          </div>
        </div>

        <AmountInput control={form.control} name="fromAmount" currency={paymentCurrency} />

        <div className="w-full">
          <Label>{t("exchangeForm.youWillReceiveLabel")}</Label>
          <input
            type="text"
            value={isRateUnavailable ? "Расчет..." : calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
            readOnly
            className="h-12 p-3 text-base w-full bg-gray-100 font-bold text-green-700 text-lg rounded-md"
          />
        </div>

        {paymentCurrency === "USDT" && <UsdtNetworkSelect control={form.control} name="usdtNetwork" />}
        <DeliveryMethodTabs value={deliveryMethod} onChange={(val) => form.setValue("deliveryMethod", val)} paymentCurrency={paymentCurrency} control={form.control} />
        <ContactInputs control={form.control} />

        <Button type="submit" className="w-full h-14 text-lg font-medium" disabled={isSubmitting || isRateUnavailable}>
          {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isSubmitting ? t("exchangeForm.processingButton") : t("exchangeForm.createOrderButton")}
        </Button>
      </form>
    </Form>
  );
}