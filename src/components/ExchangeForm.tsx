import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Loader2, AlertCircle, Landmark, HandCoins } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CountdownCircle from "./CountdownCircle";
import { useTranslation } from "react-i18next";

const PROFIT_MARGIN = 0.005;
const RUB_VND_RATE = 280;

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

interface ExchangeFormProps {
  onExchangeSuccess: (
    network: string,
    address: string,
    orderData: any,
    loadingToastId: string,
  ) => void;
}

const fetchExchangeRate = async () => {
  const { data, error } = await supabase.functions.invoke('get-exchange-rate');
  if (error) {
    throw new Error(`Ошибка вызова Edge Function: ${error.message}`);
  }
  if (!data || typeof data.rate !== 'number') {
    throw new Error('Получены неверные данные о курсе с сервера.');
  }
  return data.rate * (1 - PROFIT_MARGIN);
};

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    data: usdtVndRate, 
    isLoading: isLoadingRate, 
    isError: isErrorRate,
    dataUpdatedAt,
  } = useQuery<number>({
    queryKey: ['usdt-vnd-rate'],
    queryFn: fetchExchangeRate,
    refetchInterval: 30000,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentCurrency: "USDT",
      fromAmount: 100,
      deliveryMethod: "bank",
      telegramContact: "@",
      usdtNetwork: "TRC20",
      vndBankAccountNumber: "",
      vndBankName: "",
      contactPhone: "",
    },
  });

  const fromAmount = form.watch("fromAmount");
  const deliveryMethod = form.watch("deliveryMethod");
  const paymentCurrency = form.watch("paymentCurrency");

  useEffect(() => {
    const rate = paymentCurrency === 'USDT' ? (usdtVndRate ?? 0) : RUB_VND_RATE;
    setExchangeRate(rate);
    if (typeof fromAmount === "number" && !isNaN(fromAmount) && fromAmount > 0) {
      setCalculatedVND(fromAmount * rate);
    } else {
      setCalculatedVND(0);
    }
  }, [fromAmount, paymentCurrency, usdtVndRate]);

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
    setIsSubmitting(true);
    const loadingToastId = toast.loading("Обработка вашего запроса на обмен...", { className: "opacity-75" });

    try {
      const orderPayload = {
        ...values,
        calculatedVND,
        exchangeRate,
      };

      const { data: newOrder, error } = await supabase.functions.invoke('create-exchange-order', {
        body: orderPayload,
      });

      if (error) {
        const errorMessage = (error as any).context?.errorMessage || error.message;
        throw new Error(errorMessage);
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
        String(loadingToastId),
      );

      form.reset({
        paymentCurrency: "USDT",
        fromAmount: 100,
        deliveryMethod: "bank",
        telegramContact: "@",
        usdtNetwork: "TRC20",
        vndBankAccountNumber: "",
        vndBankName: "",
        contactPhone: "",
      });
      setCalculatedVND(0);
    } catch (error: any) {
      console.error("Error submitting exchange:", error);
      toast.error("Ошибка при создании заявки.", { description: error.message || "Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.", duration: 5000 });
      toast.dismiss(String(loadingToastId));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "h-12 p-3 text-base w-full min-w-[70%]";
  const isUsdtRateUnavailable = paymentCurrency === 'USDT' && (isLoadingRate || isErrorRate || !usdtVndRate);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isErrorRate && paymentCurrency === 'USDT' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('exchangeForm.loadingRateError')}</AlertTitle>
            <AlertDescription>
              Не удалось получить актуальный курс USDT. Обмен временно недоступен. Попробуйте обновить страницу.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
            <Label>{t('exchangeForm.exchangeCurrencyLabel')} <span className="text-red-500">*</span></Label>
            <Tabs
                value={paymentCurrency}
                onValueChange={handleCurrencyChange}
                className="w-full"
            >
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-gray-200 p-1">
                    <TabsTrigger value="USDT" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-2 text-sm font-medium text-gray-700 transition-all">{t('exchangeForm.usdt')}</TabsTrigger>
                    <TabsTrigger value="RUB" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md py-2 text-sm font-medium text-gray-700 transition-all">{t('exchangeForm.rub')}</TabsTrigger>
                </TabsList>
            </Tabs>
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
            {paymentCurrency === 'USDT' && !isLoadingRate && !isErrorRate && usdtVndRate && (
              <CountdownCircle key={dataUpdatedAt} duration={30} />
            )}
          </div>
          <Input
            type="text"
            value={isUsdtRateUnavailable && paymentCurrency === 'USDT' ? 'Расчет...' : calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
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

        <div className="text-center text-sm text-gray-600 h-6 flex items-center justify-center">
          {isLoadingRate && <Skeleton className="h-4 w-48" />}
          {isErrorRate && <span className="text-red-500 font-medium">{t('exchangeForm.loadingRateError')}</span>}
          {usdtVndRate && !isLoadingRate && !isErrorRate && paymentCurrency === 'USDT' && (
            <span>
              {t('exchangeForm.currentRate', { currency: 'USDT', rate: exchangeRate.toLocaleString("vi-VN") })}
            </span>
          )}
          {paymentCurrency === 'RUB' && (
            <span>
              {t('exchangeForm.currentRate', { currency: 'RUB', rate: exchangeRate.toLocaleString("vi-VN") })}
            </span>
          )}
        </div>

        <div className="space-y-2">
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
                <span className="text-xs sm:text-sm">{t('exchangeForm.bankAccount')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="cash"
                className="flex h-auto flex-col items-center justify-center gap-1 rounded-md p-3 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <HandCoins className="h-5 w-5" />
                <span className="text-xs sm:text-sm">{t('exchangeForm.cash')}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="bank" className="mt-4 space-y-3">
              <FormField control={form.control} name="vndBankAccountNumber" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.bankAccountNumberLabel')} <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.bankAccountNumberPlaceholder')} {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="vndBankName" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.bankNameLabel')} <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.bankNamePlaceholder')} {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
            </TabsContent>
            <TabsContent value="cash" className="mt-4 space-y-3">
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">{t('exchangeForm.cashDeliveryInfo')}</p>
              <FormField control={form.control} name="deliveryAddress" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.deliveryAddressLabel')} <span className="text-red-500">*</span><span className="block text-xs text-gray-500 font-normal mt-1">{t('exchangeForm.deliveryAddressDescription')}</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.deliveryAddressPlaceholder')} {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
            </TabsContent>
          </Tabs>
        </div>

        <FormField control={form.control} name="telegramContact" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.telegramLabel')} <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.telegramPlaceholder')} {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem className="w-full"><FormLabel>{t('exchangeForm.phoneLabel')}</FormLabel><FormControl className="w-full"><Input placeholder={t('exchangeForm.phonePlaceholder')} {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:bg-gray-400" disabled={isSubmitting || isUsdtRateUnavailable}>
          {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('exchangeForm.processingButton')}</>) : isLoadingRate && paymentCurrency === 'USDT' ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('exchangeForm.loadingRateButton')}</>) : (t('exchangeForm.exchangeNowButton'))}
        </Button>
      </form>
    </Form>
  );
}