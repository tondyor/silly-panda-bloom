"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/use-debounce";
import { useExchangeCalculation } from "@/hooks/useExchangeCalculation";
import { useRatesStore } from "@/store/ratesStore";
import { useAuthStore } from "@/store/authStore";

import CountdownCircle from "./CountdownCircle";
import { CurrencyTabs, AmountInput, UsdtNetworkSelect, DeliveryMethodTabs, ContactInputs } from "./exchange-form";
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

export interface ExchangeFormProps {
  onExchangeSuccess: (
    network: string,
    address: string,
    orderData: any,
  ) => void;
}

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { user, isReady: isAuthReady, isLoading: isAuthLoading } = useAuthStore();
  const { lastUpdated, fetchRate } = useRatesStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentCurrency: "USDT",
      fromAmount: 100,
      deliveryMethod: "bank",
      usdtNetwork: "TRC20",
    },
  });

  const fromAmount = form.watch("fromAmount");
  const paymentCurrency = form.watch("paymentCurrency");
  const deliveryMethod = form.watch("deliveryMethod");
  
  const debouncedFromAmount = useDebounce(fromAmount, 300);

  const { formattedVND, exchangeRate, isLoadingRate, calculatedVND } = useExchangeCalculation({
    fromAmount: debouncedFromAmount ?? 0,
    paymentCurrency: paymentCurrency,
  });

  useEffect(() => {
    fetchRate('USDT');
    fetchRate('RUB');
    const interval = setInterval(() => {
      fetchRate('USDT');
      fetchRate('RUB');
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const handleCurrencyChange = (value: "USDT" | "RUB") => {
    startTransition(() => {
      form.setValue("paymentCurrency", value);
      form.clearErrors("fromAmount");
      if (value === "RUB") {
        form.setValue("deliveryMethod", "cash");
      }
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user?.id) {
      setErrorMessage('Критическая ошибка: ID пользователя Telegram не найден. Пожалуйста, перезапустите приложение.');
      setIsErrorDialogOpen(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        ...values,
        fromAmount: debouncedFromAmount,
        calculatedVND,
        exchangeRate,
        telegramId: user.id,
      };

      const { data, error } = await supabase.functions.invoke("orders-create", {
        body: { orderData: orderPayload },
      });

      if (error) throw new Error(error.message);
      
      const depositAddress = values.paymentCurrency === "USDT" && values.usdtNetwork ? USDT_WALLETS[values.usdtNetwork] : "N/A";
      onExchangeSuccess(values.usdtNetwork || "N/A", depositAddress, data);

      form.reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Произошла непредвиденная ошибка.');
      setIsErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const isInitializing = isAuthLoading || !isAuthReady;
  const buttonDisabled = isInitializing || isSubmitting || isLoadingRate || isPending;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>{t("exchangeForm.exchangeCurrencyLabel")} <span className="text-red-500">*</span></Label>
            <CurrencyTabs value={paymentCurrency} onChange={handleCurrencyChange} />
            <div className="flex h-8 items-center justify-center gap-2 text-sm text-gray-600">
              {isLoadingRate ? <Skeleton className="h-4 w-48" /> : (
                <>
                  <span>1 {paymentCurrency} / {Math.round(exchangeRate).toLocaleString("vi-VN")} VND</span>
                  <CountdownCircle key={lastUpdated[paymentCurrency]} duration={30} />
                </>
              )}
            </div>
          </div>

          <AmountInput control={form.control} name="fromAmount" currency={paymentCurrency} />

          <div className="w-full">
            <Label>{t("exchangeForm.youWillReceiveLabel")}</Label>
            <input
              type="text"
              value={isLoadingRate || isPending ? "Расчет..." : formattedVND}
              readOnly
              className="h-12 p-3 text-base w-full bg-gray-100 font-bold text-green-700 text-lg rounded-md"
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

          <Button type="submit" disabled={buttonDisabled} className="w-full h-14 text-lg font-medium">
            {isSubmitting || isInitializing || isLoadingRate ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {isSubmitting ? "Создание заявки..." : "Создать заявку"}
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}