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
import { Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  fromAmount: z.number({ required_error: "Пожалуйста, введите сумму." }),
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
    deliveryMethod: "bank" | "cash",
    formData: any,
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
  return data.rate * (1 - PROFIT_MARGIN); // Применяем нашу маржу
};

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    data: usdtVndRate, 
    isLoading: isLoadingRate, 
    isError: isErrorRate 
  } = useQuery<number>({
    queryKey: ['usdt-vnd-rate'],
    queryFn: fetchExchangeRate,
    refetchInterval: 30000, // Обновлять каждые 30 секунд
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

  useEffect(() => {
    form.setValue("fromAmount", paymentCurrency === 'USDT' ? 100 : 10000);
    form.clearErrors("fromAmount");

    if (paymentCurrency === 'RUB') {
        form.setValue("deliveryMethod", "cash");
        form.setValue("vndBankAccountNumber", "");
        form.setValue("vndBankName", "");
    }
  }, [paymentCurrency, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const loadingToastId = toast.loading("Обработка вашего запроса на обмен...", { className: "opacity-75" });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      let depositAddress = "N/A";
      let network = "N/A";

      if (values.paymentCurrency === 'USDT' && values.usdtNetwork) {
        depositAddress = USDT_WALLETS[values.usdtNetwork] || "Адрес не найден.";
        network = values.usdtNetwork;
      }

      onExchangeSuccess(
        network,
        depositAddress,
        values.deliveryMethod,
        { ...values, calculatedVND, exchangeRate },
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
    } catch (error) {
      toast.error("Ошибка при обработке обмена.", { description: "Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.", duration: 5000 });
      toast.dismiss(String(loadingToastId));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "h-12 p-3 text-base w-full";
  const isUsdtRateUnavailable = paymentCurrency === 'USDT' && (isLoadingRate || isErrorRate || !usdtVndRate);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isErrorRate && paymentCurrency === 'USDT' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка загрузки курса</AlertTitle>
            <AlertDescription>
              Не удалось получить актуальный курс USDT. Обмен временно недоступен. Попробуйте обновить страницу.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
            <Label>Валюта для обмена <span className="text-red-500">*</span></Label>
            <Tabs
                value={paymentCurrency}
                onValueChange={(value) => form.setValue("paymentCurrency", value as "USDT" | "RUB")}
                className="w-full"
            >
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-transparent p-0">
                    <TabsTrigger value="USDT" className="rounded-md bg-gray-700/50 py-2 text-sm text-gray-100 transition-colors data-[state=active]:bg-blue-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">USDT</TabsTrigger>
                    <TabsTrigger value="RUB" className="rounded-md bg-gray-700/50 py-2 text-sm text-gray-100 transition-colors data-[state=active]:bg-red-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">Рубли</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        <FormField
          control={form.control}
          name="fromAmount"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>
                Сумма {paymentCurrency} <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl className="w-full">
                <Input
                  type="number"
                  placeholder={`Введите сумму в ${paymentCurrency}`}
                  {...field}
                  value={String(field.value ?? "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? undefined : parseFloat(val));
                  }}
                  className={inputClass + " text-lg"}
                  step={1}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="w-full">
          <Label className="mb-2 block">Вы получите (VND)</Label>
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
                <FormLabel>Сеть USDT <span className="text-red-500">*</span></FormLabel>
                <FormControl className="w-full">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Выберите сеть USDT" /></SelectTrigger>
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
          {paymentCurrency === 'USDT' ? (
            <>
              {isLoadingRate && <Skeleton className="h-4 w-48" />}
              {isErrorRate && <span className="text-red-500 font-medium">Не удалось загрузить курс</span>}
              {usdtVndRate && !isLoadingRate && !isErrorRate && (
                <span>
                  Текущий курс: 1 USDT ≈{" "}
                  <span className="font-semibold text-blue-600">
                    {exchangeRate.toLocaleString("vi-VN")} VND
                  </span>
                </span>
              )}
            </>
          ) : (
            <span>
              Текущий курс: 1 RUB ={" "}
              <span className="font-semibold text-blue-600">
                {exchangeRate.toLocaleString("vi-VN")} VND
              </span>
            </span>
          )}
        </div>

        <div className="space-y-3">
          <Label>Способ получения VND <span className="text-red-500">*</span></Label>
          <Tabs
            value={deliveryMethod}
            onValueChange={(value) => form.setValue("deliveryMethod", value as "bank" | "cash")}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-transparent p-0">
              <TabsTrigger
                value="bank"
                disabled={paymentCurrency === 'RUB'}
                className="rounded-md bg-gray-700/50 py-2 text-sm text-gray-100 transition-colors data-[state=active]:bg-green-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                На банковский счет
              </TabsTrigger>
              <TabsTrigger
                value="cash"
                className="rounded-md bg-gray-700/50 py-2 text-sm text-gray-100 transition-colors data-[state=active]:bg-green-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Наличными (доставка)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="bank" className="mt-4 space-y-3">
              <FormField control={form.control} name="vndBankAccountNumber" render={({ field }) => (<FormItem className="w-full"><FormLabel>Номер карты или счета VND <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder="Введите номер карты или счета" {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="vndBankName" render={({ field }) => (<FormItem className="w-full"><FormLabel>Название банка VND <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder="Например, Vietcombank" {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
            </TabsContent>
            <TabsContent value="cash" className="mt-4 space-y-3">
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">Мы доставляем наличные по Данангу и Хойану в течение 15-30 минут.</p>
              <FormField control={form.control} name="deliveryAddress" render={({ field }) => (<FormItem className="w-full"><FormLabel>Адрес доставки (Дананг/ХойаН) <span className="text-red-500">*</span><span className="block text-xs text-gray-500 font-normal mt-1">Укажите как можно больше деталей: название отеля, номер комнаты, точный адрес или ссылку на Google Maps.</span></FormLabel><FormControl className="w-full"><Input placeholder="Введите полный адрес доставки" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
            </TabsContent>
          </Tabs>
        </div>

        <FormField control={form.control} name="telegramContact" render={({ field }) => (<FormItem className="w-full"><FormLabel>Ваш Telegram (для связи) <span className="text-red-500">*</span></FormLabel><FormControl className="w-full"><Input placeholder="@ваш_никнейм" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem className="w-full"><FormLabel>Контактный телефон</FormLabel><FormControl className="w-full"><Input placeholder="Введите ваш номер телефона" {...field} value={String(field.value ?? "")} className={inputClass} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full py-3 text-lg rounded-full bg-gradient-to-b from-green-400 to-green-700 text-white shadow-xl hover:from-green-500 hover:to-green-800 transition-all duration-300 ease-in-out disabled:opacity-60" disabled={isSubmitting || isUsdtRateUnavailable}>
          {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Обработка...</>) : isLoadingRate && paymentCurrency === 'USDT' ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка курса...</>) : ("Обменять сейчас")}
        </Button>
      </form>
    </Form>
  );
}