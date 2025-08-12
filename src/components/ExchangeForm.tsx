"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store";
import { useDebounce } from "@/hooks/use-debounce";

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
  telegramUser: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  isInitializing: boolean;
}

const getButtonState = (
  isInitializing: boolean, 
  isSubmitting: boolean, 
  isLoadingRate: boolean
) => {
  if (isInitializing) {
    return { 
      disabled: true, 
      text: "Инициализация...", 
      className: "bg-gray-400 cursor-not-allowed" 
    };
  }
  if (isSubmitting) {
    return { 
      disabled: true, 
      text: "Создание заявки...", 
      className: "bg-blue-400 cursor-not-allowed" 
    };
  }
  if (isLoadingRate) {
    return { 
      disabled: true, 
      text: "Загрузка курса...", 
      className: "bg-yellow-400 cursor-not-allowed" 
    };
  }
  return { 
    disabled: false, 
    text: "Создать заявку", 
    className: "bg-green-600 hover:bg-green-700" 
  };
};

export function ExchangeForm({ onExchangeSuccess, telegramUser, isInitializing }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

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

  const paymentCurrency = form.watch("paymentCurrency");
  const fromAmount = form.watch("fromAmount");
  const deliveryMethod = form.watch("deliveryMethod");

  const debouncedFromAmount = useDebounce(fromAmount, 500);

  const { rates } = useAppStore();
  const currentRateData = rates[paymentCurrency];
  const exchangeRate = currentRateData?.rate ?? 0;
  const isLoadingRate = currentRateData?.isLoading;
  const isErrorRate = !!currentRateData?.error;
  const dataUpdatedAt = currentRateData?.lastUpdated;

  useEffect(() => {
    if (isInitializing) return;
    const isInitialMount = !form.formState.isDirty;
    if (isInitialMount && fromAmount === undefined) {
      form.setValue("fromAmount", 100, { shouldValidate: true });
    }
  }, [isInitializing, form, fromAmount]);

  useEffect(() => {
    const displayRate = Math.round(exchangeRate);
    if (typeof debouncedFromAmount === "number" && !isNaN(debouncedFromAmount) && debouncedFromAmount > 0 && displayRate > 0) {
      setCalculatedVND(debouncedFromAmount * displayRate);
    } else {
      setCalculatedVND(0);
    }
  }, [debouncedFromAmount, exchangeRate]);

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
    if (!telegramUser?.id) {
      setErrorMessage('Критическая ошибка: ID пользователя Telegram не найден. Пожалуйста, перезапустите приложение.');
      setIsErrorDialogOpen(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let depositAddress = "N/A";
      if (values.paymentCurrency === "USDT" && values.usdtNetwork) {
        depositAddress = USDT_WALLETS[values.usdtNetwork] || "Адрес не найден.";
      }

      const orderPayload = {
        ...values,
        calculatedVND,
        exchangeRate,
        telegramId: telegramUser.id,
      };

      const { data, error } = await supabase.functions.invoke("orders-create", {
        body: { orderData: orderPayload },
      });

      if (error) {
        setErrorMessage(`Ошибка сервера: ${error.message || 'Неизвестная ошибка'}`);
        setIsErrorDialogOpen(true);
        return;
      }

      if (!data || !("public_id" in data)) {
        setErrorMessage("Не удалось создать заказ. Ответ от сервера не содержит ID заказа.");
        setIsErrorDialogOpen(true);
        return;
      }

      onExchangeSuccess(values.usdtNetwork || "N/A", depositAddress, data);
      form.reset();
      setCalculatedVND(0);
    } catch (error) {
      console.error("Error submitting exchange:", error);
      setErrorMessage(error instanceof Error ? error.message : 'Произошла непредвиденная ошибка.');
      setIsErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const buttonState = getButtonState(isInitializing, isSubmitting, isLoadingRate);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {isErrorRate && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("exchangeForm.loadingRateError")}</AlertTitle>
              <AlertDescription>
                Не удалось получить актуальный курс. Обмен временно недоступен. Попробуйте обновить страницу.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label>
              {t("exchangeForm.exchangeCurrencyLabel")} <span className="text-red-500">*</span>
            </Label>
            <CurrencyTabs value={paymentCurrency} onChange={handleCurrencyChange} />
            <div className="flex h-8 items-center justify-center gap-2 text-sm text-gray-600">
              {isLoadingRate && <Skeleton className="h-4 w-48" />}
              {!isLoadingRate && !isErrorRate && exchangeRate > 0 && (
                <>
                  <span>1 {paymentCurrency} / {Math.round(exchangeRate).toLocaleString("vi-VN")} VND</span>
                  <CountdownCircle key={dataUpdatedAt} duration={30} />
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
                isLoadingRate
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
            disabled={buttonState.disabled}
            className={`w-full h-14 text-lg font-medium rounded-xl text-white shadow-lg transition-all duration-300 ease-in-out ${buttonState.className}`}
          >
            {isSubmitting || isLoadingRate || isInitializing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {buttonState.text}
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