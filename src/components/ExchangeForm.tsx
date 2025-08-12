"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Landmark, HandCoins } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CountdownCircle from "./CountdownCircle";
import { useTranslation } from "react-i18next";

const PROFIT_MARGIN = -0.02; // вычитаем 2%

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
  telegramContact: z
    .string()
    .min(3, "Имя пользователя Telegram должно содержать не менее 3 символов.")
    .max(32, "Имя пользователя Telegram должно содержать не более 32 символов.")
    .regex(/^@[a-zA-Z0-9_]{3,32}$/, "Неверный формат имени пользователя Telegram (начните с @)."),
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
    if (data.paymentCurrency === 'USDT') {
        if (!data.usdtNetwork) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Пожалуйста, выберите сеть USDT.", path: ["usdtNetwork"] });
        }
        if (data.fromAmount < 100) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Минимальная сумма обмена 100 USDT.", path: ["fromAmount"] });
        }
        if (data.fromAmount > 100000) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Максимальная сумма обмена 100,000 USDT.", path: ["fromAmount"] });
        }
    } else if (data.paymentCurrency === 'RUB') {
        if (data.deliveryMethod !== 'cash') {
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

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  language_code?: string;
}

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
    }
  } catch {}

  try {
    const res = await fetch("https://api.coinpaprika.com/v1/tickers/usdt-tether");
    if (res.ok) {
      const data = await res.json();
      const price = data?.quotes?.VND?.price;
      if (typeof price === "number") results.push(price);
    }
  } catch {}

  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=VND");
    if (res.ok) {
      const data = await res.json();
      const price = data?.VND;
      if (typeof price === "number") results.push(price);
    }
  } catch {}

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
    }
  } catch {}

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=RUB&to=VND");
    if (res.ok) {
      const data = await res.json();
      const price = data?.rates?.VND;
      if (typeof price === "number") results.push(price);
    }
  } catch {}

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/RUB");
    if (res.ok) {
      const data = await res.json();
      const price = data?.rates?.VND;
      if (typeof price === "number") results.push(price);
    }
  } catch {}

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
    throw new Error(`Не удалось получить курс для ${currency}-VND`);
  }

  const avgRate = average(rates);
  return avgRate * (1 + PROFIT_MARGIN);
};

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        setTelegramUser(user);
      }
    }
  }, []);

  const { 
    data: usdtVndRate, 
    isLoading: isLoadingRate, 
    isError: isErrorRate,
    dataUpdatedAt: usdtDataUpdatedAt,
  } = useQuery<number>({
    queryKey: ['usdt-vnd-rate'],
    queryFn: () => fetchExchangeRate("USDT"),
    refetchInterval: 30000,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const { 
    data: rubVndRate,
    dataUpdatedAt: rubDataUpdatedAt,
  } = useQuery<number>({
    queryKey: ['rub-vnd-rate'],
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
      telegramContact: "@",
      usdtNetwork: "TRC20",
      vndBankAccountNumber: "",
      vndBankName: "",
      contactPhone: "",
    },
  });

  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    if (isInitialMount.current) {
      if (form.getValues('fromAmount') === undefined) {
        form.setValue('fromAmount', 100, { shouldValidate: true });
      }
      isInitialMount.current = false;
    }
  }, [form]);

  const fromAmount = form.watch("fromAmount");
  const deliveryMethod = form.watch("deliveryMethod");
  const paymentCurrency = form.watch("paymentCurrency");

  React.useEffect(() => {
    const preciseRate = paymentCurrency === 'USDT' ? (usdtVndRate ?? 0) : (rubVndRate ?? 0);
    setExchangeRate(preciseRate);

    const displayRate = Math.round(preciseRate);

    if (typeof fromAmount === "number" && !isNaN(fromAmount) && fromAmount > 0) {
      setCalculatedVND(fromAmount * displayRate);
    } else {
      setCalculatedVND(0);
    }
  }, [fromAmount, paymentCurrency, usdtVndRate, rubVndRate]);

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as "USDT" | "RUB";
    form.setValue("paymentCurrency", newCurrency);
    form.clearErrors("fromAmount");

    if (newCurrency === 'RUB') {
        form.setValue("deliveryMethod", "cash");
        form.setValue("vndBankAccountNumber", "");
        form.setValue("vndBankName", "");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!telegramUser) {
      // Убрано любое всплывающее уведомление
      return;
    }
    
    setIsSubmitting(true);

    try {
      const orderPayload = {
        orderData: {
          ...values,
          calculatedVND,
          exchangeRate,
        },
        telegramUser: telegramUser,
      };

      const { data: newOrder, error } = await supabase.functions.invoke('create-exchange-order', {
        body: orderPayload,
      });

      if (error) {
        // Убрано любое всплывающее уведомление
        throw new Error(error.message || "Ошибка при создании заявки.");
      }
      
      if (!newOrder || !newOrder.public_id) {
        throw new Error("Не удалось создать заказ. Ответ от сервера не содержит ID заказа.");
      }

      let depositAddress = "N/A";
      let network = "N/A";

      if (values.paymentCurrency === 'USDT' && values.usdtNetwork) {
        depositAddress = USDT_WALLETS[values.usdtNetwork] || "Адрес не найден.";
        network = values.usdtNetwork;
      }

      onExchangeSuccess(
        network,
        depositAddress,
        newOrder,
      );

      form.reset();
      setCalculatedVND(0);
    } catch (error) {
      // Убрано любое всплывающее уведомление
      console.error("Error submitting exchange:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "h-12 p-3 text-base w-full min-w-[70%]";
  const isUsdtRateUnavailable = paymentCurrency === 'USDT' && (isLoadingRate || isErrorRate || !usdtVndRate);
  const isRubRateUnavailable = paymentCurrency === 'RUB' && (!rubVndRate);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {(isErrorRate && paymentCurrency === 'USDT') && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('exchangeForm.loadingRateError')}</AlertTitle>
            <AlertDescription>
              Не удалось получить актуальный курс USDT. Обмен временно недоступен. Попробуйте обновить страницу.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-1">
            <Label>{t('exchangeForm.exchangeCurrencyLabel')} <span className="text-red-500">*</span></Label>
            <Tabs
                value={paymentCurrency}
                onValueChange={handleCurrencyChange}
                className="w-full"
            >
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-gray-200 p-1">
                    <TabsTrigger value="USDT" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-2 text-sm font-medium text-gray-700 transition-all">{t('exchangeForm.usdt')}</TabsTrigger>
                    <TabsTrigger value="RUB" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-2 text-sm font-medium text-gray-700 transition-all">{t('exchangeForm.rub')}</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="flex h-8 items-center justify-center gap-2 text-sm text-gray-600">
                {paymentCurrency === 'USDT' && (
                  <>
                    {isLoadingRate && <Skeleton className="h-4 w-48" />}
                    {isErrorRate && <span className="text-red-500 font-medium">{t('exchangeForm.loadingRateError')}</span>}
                    {!isLoadingRate && !isErrorRate && usdtVndRate && (
                      <>
                        <span>
                          1 USDT / {exchangeRate.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VND
                        </span>
                        <CountdownCircle key={usdtDataUpdatedAt} duration={30} />
                      </>
                    )}
                  </>
                )}
                {paymentCurrency === 'RUB' && (
                  <>
                    {isRubRateUnavailable && <Skeleton className="h-4 w-48" />}
                    {!isRubRateUnavailable && rubVndRate && (
                      <>
                        <span>
                          1 RUB / {exchangeRate.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VND
                        </span>
                        <CountdownCircle key={rubDataUpdatedAt} duration={30} />
                      </>
                    )}
                  </>
                )}
            </div>
        </div>

        <FormField
          control={form.control}
          name="fromAmount"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>
                {t('exchangeForm.amountLabel', { currency: paymentCurrency })} <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl className="w-full">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={t('exchangeForm.amountPlaceholder', { currency: paymentCurrency })}
                  {...field}
                  value={field.value === undefined ? "" : String(field.value)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numericValue = val.replace(/[^0-9]/g, '');
                    field.onChange(numericValue === '' ? undefined : Number(numericValue));
                  }}
                  className={inputClass + " text-lg"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <Label>{t('exchangeForm.youWillReceiveLabel')}</Label>
          </div>
          <Input
            type="text"
            value={(isUsdtRateUnavailable && paymentCurrency === 'USDT') || (isRubRateUnavailable && paymentCurrency === 'RUB') ? 'Расчет...' : calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
            readOnly
            className={inputClass + " bg-gray-100 font-bold text-green-700 text-lg"}
          />
        </div>

        {paymentCurrency === 'USDT' && (
            <FormField
            control={form.control}
            name="usdtNetwork"
            render={({ field }) => (
                <FormItem className="w-full">
                <FormLabel>{t('exchangeForm.usdtNetworkLabel')} <span className="text-red-500">*</span></FormLabel>
                <FormControl className="w-full">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={t('exchangeForm.selectNetworkPlaceholder')} /></SelectTrigger>
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
        )}

        <div className="space-y-1">
          <Label>{t('exchangeForm.deliveryMethodLabel')} <span className="text-red-500">*</span></Label>
          <Tabs
            value={deliveryMethod}
            onValueChange={(value) => form.setValue("deliveryMethod", value as "bank" | "cash")}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-gray-200 p-1">
              <TabsTrigger
                value="bank"
                disabled={paymentCurrency === 'RUB'}
                className="flex h-auto flex-col items-center justify-center gap-1 rounded-md p-3 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Landmark className="h-5 w-5" />
                <span className="text-sm font-medium">{t('exchangeForm.bankAccount')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="cash"
                className="flex h-auto flex-col items-center justify-center gap-1 rounded-md p-3 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <HandCoins className="h-5 w-5" />
                <span className="text-sm font-medium">{t('exchangeForm.cash')}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="bank" className="mt-2 space-y-2">
              <FormField control={form.control} name="vndBankAccountNumber" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.bankAccountNumberLabel')} <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.bankAccountNumberPlaceholder')} {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="vndBankName" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.bankNameLabel')} <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.bankNamePlaceholder')} {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
            </TabsContent>
            <TabsContent value="cash" className="mt-2 space-y-2">
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                Доставим наличные по Данангу и Хойану в течение 15-30 минут или выдадим через ближайший банкомат по всему Вьетнаму.
              </p>
              <FormField control={form.control} name="deliveryAddress" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.deliveryAddressLabel')} <span className="text-red-500">*</span><span className="block text-xs text-gray-500 font-normal mt-1">{t('exchangeForm.deliveryAddressDescription')}</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.deliveryAddressPlaceholder')} {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
            </TabsContent>
          </Tabs>
        </div>

        <FormField control={form.control} name="telegramContact" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.telegramLabel')} <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.telegramPlaceholder')} {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.phoneLabel')}</FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.phonePlaceholder')} {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full h-14 text-lg font-medium rounded-xl bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:bg-gray-400" disabled={isSubmitting || (isUsdtRateUnavailable && paymentCurrency === 'USDT') || (isRubRateUnavailable && paymentCurrency === 'RUB')}>
          {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('exchangeForm.processingButton')}</>) : (isLoadingRate && paymentCurrency === 'USDT') ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('exchangeForm.loadingRateButton')}</>) : "Создать заявку"}
        </Button>
      </form>
    </Form>
  );
}