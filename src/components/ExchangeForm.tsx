"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import CountdownCircle from "./CountdownCircle";
import { CurrencyTabs, AmountInput, UsdtNetworkSelect, DeliveryMethodTabs, ContactInputs } from "./exchange-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROFIT_MARGIN = -0.02;

const USDT_WALLETS: Record<string, string> = {
  BEP20: "0x66095f5be059C3C3e1f44416aEAd8085B8F42F3e",
  TON: "UQCgn4ztELQZLiGWTtOFcZoN22Lf4B6Vd7IO6WsBZuXM8edg",
  TRC20: "TAAQEjDBQK5hN1MGumVUjtzX42qRYCjTkB",
  ERC20: "0x54C7fA815AE5a5DDEd5DAa4A36CFB6903cE7D896",
  SPL: "9vBe1AP3197jP4PSjC2jUsyadr82Sey3nXbxAT3LSQwm",
};

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
      const price = data?.tether?.vnd;
      if (typeof price === "number") results.push(price);
    } else {
      console.error("CoinGecko API error:", res.status);
    }
  } catch (e) {
    console.error("CoinGecko fetch error:", e);
  }

  try {
    const res = await fetch("https://api.coinpaprika.com/v1/tickers/usdt-tether");
    if (res.ok) {
      const data = await res.json();
      const price = data?.quotes?.VND?.price;
      if (typeof price === "number") results.push(price);
    } else {
      console.error("CoinPaprika API error:", res.status);
    }
  } catch (e) {
    console.error("CoinPaprika fetch error:", e);
  }

  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=VND");
    if (res.ok) {
      const data = await res.json();
      const price = data?.VND;
      if (typeof price === "number") results.push(price);
    } else {
      console.error("CryptoCompare API error:", res.status);
    }
  } catch (e) {
    console.error("CryptoCompare fetch error:", e);
  }

  return results;
}

async function fetchRubVndRates(): Promise<number[]> {
  const results: number[] = [];

  try {
    const res = await fetch("https://api.exchangerate.host/convert?from=RUB&to=VND");
    if (res.ok) {
      const data = await res.json();
      const price = data?.result;
      if (typeof price === "number") results.push(price);
    } else {
      console.error("ExchangeRate.host API error:", res.status);
    }
  } catch (e) {
    console.error("ExchangeRate.host fetch error:", e);
  }

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=RUB&to=VND");
    if (res.ok) {
      const data = await res.json();
      const price = data?.rates?.VND;
      if (typeof price === "number") results.push(price);
    } else {
      console.error("Frankfurter API error:", res.status);
    }
  } catch (e) {
    console.error("Frankfurter fetch error:", e);
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/RUB");
    if (res.ok) {
      const data = await res.json();
      const price = data?.rates?.VND;
      if (typeof price === "number") results.push(price);
    } else {
      console.error("ER API error:", res.status);
    }
  } catch (e) {
    console.error("ER API fetch error:", e);
  }

  return results;
}

const fetchExchangeRate = async (currency: "USDT" | "RUB"): Promise<number> => {
  let rates: number[] = [];
  if (currency === "USDT") {
    rates = await fetchUsdtVndRates();
  } else {
    rates = await fetchRubVndRates();
  }

  if (rates.length === 0) {
    console.warn(`No rates fetched for ${currency}-VND, falling back to default rate.`);
    // fallback rates (example values, adjust as needed)
    return currency === "USDT" ? 24000 : 300;
  }

  const avgRate = average(rates);
  return avgRate * (1 + PROFIT_MARGIN);
};

interface TelegramUser {
  telegram_id: number; // Используем telegram_id, как в вашей таблице
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ExchangeFormProps {
  onExchangeSuccess: (
    network: string,
    address: string,
    orderData: any,
  ) => void;
  telegramUser: TelegramUser | null;
}

export function ExchangeForm({ onExchangeSuccess, telegramUser }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  // Добавляем принудительное логирование для отладки
  useEffect(() => {
    console.log("ExchangeForm received telegramUser:", telegramUser);
  }, [telegramUser]);

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
    refetchOnWindowFocus: true,
  });

  const { data: rubVndRate, dataUpdatedAt: rubDataUpdatedAt } = useQuery<number>({
    queryKey: ["rub-vnd-rate"],
    queryFn: () => fetchExchangeRate("RUB"),
    refetchInterval: 30000,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentCurrency: "USDT",
      deliveryMethod: "bank",
      usdtNetwork: "TRC20",
      contactPhone: "",
      vndBankAccountNumber: "",
      vndBankName: "",
    },
  });

  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    if (isInitialMount.current) {
      if (form.getValues("fromAmount") === undefined) {
        form.setValue("fromAmount", 100, { shouldValidate: true });
      }
      isInitialMount.current = false;
    }
  }, [form]);

  const fromAmount = form.watch("fromAmount");
  const deliveryMethod = form.watch("deliveryMethod");
  const paymentCurrency = form.watch("paymentCurrency");

  React.useEffect(() => {
    const preciseRate = paymentCurrency === "USDT" ? usdtVndRate ?? 0 : rubVndRate ?? 0;
    setExchangeRate(preciseRate);

    const displayRate = Math.round(preciseRate);

    if (typeof fromAmount === "number" && !isNaN(fromAmount) && fromAmount > 0) {
      setCalculatedVND(fromAmount * displayRate);
    } else {
      setCalculatedVND(0);
    }
  }, [fromAmount, paymentCurrency, usdtVndRate, rubVndRate]);

  const handleCurrencyChange = (value: "USDT" | "RUB") => {
    form.setValue("paymentCurrency", value);
    form.clearErrors("fromAmount");

    if (value === "RUB") {
      form.setValue("deliveryMethod", "cash");
      form.setValue("vndBankAccountNumber", "");
      form.setValue("vndBankName", "");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log("Form onSubmit, telegramUser is:", telegramUser); // Логируем перед отправкой

    try {
      let depositAddress = "N/A";
      if (values.paymentCurrency === "USDT" && values.usdtNetwork) {
        depositAddress = USDT_WALLETS[values.usdtNetwork] || "Адрес не найден.";
      }

      const orderPayload = {
        orderData: {
          ...values,
          calculatedVND,
          exchangeRate,
          telegramId: telegramUser ? telegramUser.telegram_id : null,
          telegramUserFirstName: telegramUser ? telegramUser.first_name : null,
          depositAddress: depositAddress,
        },
      };

      console.log("Sending order payload to server:", orderPayload); // Логируем полезную нагрузку

      const { data, error } = await supabase.functions.invoke("create-exchange-order", {
        body: orderPayload,
      });

      if (error) {
        setErrorMessage(`Ошибка сервера: ${error.message || error}`);
        setIsErrorDialogOpen(true);
        throw new Error(`Server error: ${error.message || error}`);
      }

      if (!data || !("public_id" in data)) {
        setErrorMessage("Не удалось создать заказ. Ответ от сервера не содержит ID заказа.");
        setIsErrorDialogOpen(true);
        throw new Error("Не удалось создать заказ. Ответ от сервера не содержит ID заказа.");
      }

      let network = "N/A";

      if (values.paymentCurrency === "USDT" && values.usdtNetwork) {
        network = values.usdtNetwork;
      }

      onExchangeSuccess(network, depositAddress, data);

      form.reset();
      setCalculatedVND(0);
    } catch (error) {
      console.error("Error submitting exchange:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isUsdtRateUnavailable = paymentCurrency === "USDT" && (isLoadingRate || isErrorRate || !usdtVndRate);
  const isRubRateUnavailable = paymentCurrency === "RUB" && !rubVndRate;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {isErrorRate && paymentCurrency === "USDT" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("exchangeForm.loadingRateError")}</AlertTitle>
              <AlertDescription>
                Не удалось получить актуальный курс USDT. Обмен временно недоступен. Попробуйте обновить страницу.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label>
              {t("exchangeForm.exchangeCurrencyLabel")} <span className="text-red-500">*</span>
            </Label>
            <CurrencyTabs value={paymentCurrency} onChange={handleCurrencyChange} />
            <div className="flex h-8 items-center justify-center gap-2 text-sm text-gray-600">
              {paymentCurrency === "USDT" && (
                <>
                  {isLoadingRate && <Skeleton className="h-4 w-48" />}
                  {isErrorRate && <span className="text-red-500 font-medium">{t("exchangeForm.loadingRateError")}</span>}
                  {!isLoadingRate && !isErrorRate && usdtVndRate && (
                    <>
                      <span>1 USDT / {exchangeRate.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VND</span>
                      <CountdownCircle key={usdtDataUpdatedAt} duration={30} />
                    </>
                  )}
                </>
              )}
              {paymentCurrency === "RUB" && (
                <>
                  {isRubRateUnavailable && <Skeleton className="h-4 w-48" />}
                  {!isRubRateUnavailable && rubVndRate && (
                    <>
                      <span>1 RUB / {exchangeRate.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VND</span>
                      <CountdownCircle key={rubDataUpdatedAt} duration={30} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <AmountInput control={form.control} name="fromAmount" currency={paymentCurrency} />

          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <Label>{t("exchangeForm.youWillReceiveLabel")}</Label>
            </div>
            <input
              type="text"
              value={
                (isUsdtRateUnavailable && paymentCurrency === "USDT") ||
                (isRubRateUnavailable && paymentCurrency === "RUB")
                  ? "Расчет..."
                  : calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
              }
              readOnly
              className="h-12 p-3 text-base w-full min-w-[70%] bg-gray-100 font-bold text-green-700 text-lg rounded-md"
            />
          </div>

          {paymentCurrency === "USDT" && <UsdtNetworkSelect control={form.control} name="usdtNetwork" />}

          <DeliveryMethodTabs
            value={deliveryMethod}
            onChange={(val) => form.setValue("deliveryMethod", val)}
            paymentCurrency={paymentCurrency}
            control={form.control}
          />

          <ContactInputs control={form.control} />

          <Button
            type="submit"
            className="w-full h-14 text-lg font-medium rounded-xl bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:bg-gray-400"
            disabled={isSubmitting || (isUsdtRateUnavailable && paymentCurrency === "USDT") || (isRubRateUnavailable && paymentCurrency === "RUB")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("exchangeForm.processingButton")}
              </>
            ) : isLoadingRate && paymentCurrency === "USDT" ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("exchangeForm.loadingRateButton")}
              </>
            ) : (
              "Создать заявку"
            )}
          </Button>
        </form>
      </Form>

      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ошибка</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Закрыть</AlertDialogCancel>
            <AlertDialogAction onClick={() => setIsErrorDialogOpen(false)}>Ок</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}