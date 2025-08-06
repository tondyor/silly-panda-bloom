import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OFFICIAL_USDT_VND_RATE = 25000;
const PROFIT_MARGIN = 0.005;

const USDT_WALLETS: Record<string, string> = {
  BEP20: "0x66095f5be059C3C3e1f44416aEAd8085B8F42F3e",
  TON: "UQCgn4ztELQZLiGWTtOFcZoN22Lf4B6Vd7IO6WsBZuXM8edg",
  TRC20: "TAAQEjDBQK5hN1MGumVUjtzX42qRYCjTkB",
  ERC20: "0x54C7fA815AE5a5DDEd5DAa4A36CFB6903cE7D896",
  SPL: "9vBe1AP3197jP4PSjC2jUsyadr82Sey3nXbxAT3LSQwm",
};

const commonFields = {
  usdtAmount: z
    .number()
    .min(100, "Минимальная сумма обмена 100 USDT.")
    .max(100000, "Максимальная сумма обмена 100,000 USDT."),
  telegramContact: z
    .string()
    .min(3, "Имя пользователя Telegram должно содержать не менее 3 символов.")
    .max(32, "Имя пользователя Telegram должно содержать не более 32 символов.")
    .regex(/^@[a-zA-Z0-9_]{3,32}$/, "Неверный формат имени пользователя Telegram (начните с @)."),
  usdtNetwork: z.enum(["BEP20", "TRC20", "ERC20", "TON", "SPL"], {
    required_error: "Пожалуйста, выберите сеть USDT.",
  }),
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
]);

interface ExchangeFormProps {
  onExchangeSuccess: (
    network: string,
    address: string,
    deliveryMethod: "bank" | "cash",
    formData: any,
    loadingToastId: string,
  ) => void;
}

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usdtAmount: 100,
      deliveryMethod: "bank",
      telegramContact: "@",
      usdtNetwork: "TRC20",
      vndBankAccountNumber: "",
      vndBankName: "",
      contactPhone: "",
    },
  });

  const usdtAmount = form.watch("usdtAmount");
  const deliveryMethod = form.watch("deliveryMethod");
  const contactPhone = form.watch("contactPhone");

  useEffect(() => {
    const rate = OFFICIAL_USDT_VND_RATE * (1 + PROFIT_MARGIN);
    setExchangeRate(rate);
    if (typeof usdtAmount === "number" && !isNaN(usdtAmount) && usdtAmount > 0) {
      setCalculatedVND(usdtAmount * rate);
    } else {
      setCalculatedVND(0);
    }
  }, [usdtAmount]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const loadingToastId = toast.loading("Обработка вашего запроса на обмен...", {
      className: "opacity-75",
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const depositAddress = USDT_WALLETS[values.usdtNetwork];
      if (depositAddress) {
        onExchangeSuccess(
          values.usdtNetwork,
          depositAddress,
          values.deliveryMethod,
          { ...values, calculatedVND, exchangeRate },
          String(loadingToastId),
        );
      } else {
        onExchangeSuccess(
          values.usdtNetwork,
          "Адрес не найден. Пожалуйста, свяжитесь с поддержкой.",
          values.deliveryMethod,
          { ...values, calculatedVND, exchangeRate },
          String(loadingToastId),
        );
      }

      if (deliveryMethod === "bank") {
        form.reset({
          usdtAmount: 100,
          deliveryMethod: "bank",
          telegramContact: "@",
          usdtNetwork: "TRC20",
          vndBankAccountNumber: "",
          vndBankName: "",
          contactPhone: "",
        });
      } else {
        form.reset({
          usdtAmount: 100,
          deliveryMethod: "cash",
          telegramContact: "@",
          usdtNetwork: "TRC20",
          deliveryAddress: "",
          contactPhone: "",
        });
      }
      setCalculatedVND(0);
    } catch (error) {
      toast.error("Ошибка при обработке обмена.", {
        description: "Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.",
        duration: 5000,
      });
      toast.dismiss(String(loadingToastId));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Универсальный класс для всех инпутов и селектов
  const inputClass = "h-12 p-3 text-base w-full";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="usdtAmount"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>
                Сумма USDT <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl className="w-full">
                <Input
                  type="number"
                  placeholder="Введите сумму USDT"
                  {...field}
                  value={String(field.value ?? "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      field.onChange(undefined);
                    } else {
                      const parsed = parseFloat(val);
                      field.onChange(isNaN(parsed) ? undefined : parsed);
                    }
                  }}
                  className={inputClass + " text-lg"}
                  min={100}
                  max={100000}
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
            value={calculatedVND.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
            readOnly
            className={inputClass + " bg-gray-100 font-bold text-green-700 text-lg"}
          />
        </div>

        <FormField
          control={form.control}
          name="usdtNetwork"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>
                Сеть USDT <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl className="w-full">
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Выберите сеть USDT" />
                  </SelectTrigger>
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

        <div className="text-center text-sm text-gray-600">
          Текущий курс: 1 USDT ={" "}
          <span className="font-semibold text-blue-600">
            {exchangeRate.toLocaleString("vi-VN")} VND
          </span>
        </div>

        {/* Delivery Method Tabs */}
        <div className="space-y-3">
          <Label>
            Способ получения VND <span className="text-red-500">*</span>
          </Label>
          <Tabs
            value={deliveryMethod}
            onValueChange={(value) =>
              form.setValue("deliveryMethod", value as "bank" | "cash")
            }
            className="w-full overflow-hidden rounded-none"
          >
            <TabsList className="grid w-full grid-cols-2 bg-transparent rounded-none border-none">
              <TabsTrigger
                value="bank"
                className="text-lg py-3 px-6 transition-all duration-300 ease-in-out
                           transform skew-x-[1deg] -mr-1
                           data-[state=active]:bg-gradient-to-b data-[state=active]:from-green-400 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:z-20
                           data-[state=inactive]:bg-gradient-to-b data-[state=inactive]:from-red-400 data-[state=inactive]:to-red-700 data-[state=inactive]:text-white data-[state=inactive]:opacity-75 data-[state=inactive]:shadow-sm data-[state=inactive]:z-10"
              >
                <span className="inline-block -skew-x-[1deg]">На банковский счет</span>
              </TabsTrigger>
              <TabsTrigger
                value="cash"
                className="text-lg py-3 px-6 transition-all duration-300 ease-in-out
                           transform -skew-x-[1deg] -ml-1
                           data-[state=active]:bg-gradient-to-b data-[state=active]:from-green-400 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:z-20
                           data-[state=inactive]:bg-gradient-to-b data-[state=inactive]:from-red-400 data-[state=inactive]:to-red-700 data-[state=inactive]:text-white data-[state=inactive]:opacity-75 data-[state=inactive]:shadow-sm data-[state=inactive]:z-10"
              >
                <span className="inline-block skew-x-[1deg]">Наличными (доставка)</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="bank" className="mt-4 space-y-4 px-6">
              <FormField
                control={form.control}
                name="vndBankAccountNumber"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>
                      Номер карты или счета VND <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl className="w-full">
                      <Input placeholder="Введите номер карты или счета" {...field} value={String(field.value ?? "")} className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vndBankName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>
                      Название банка VND <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl className="w-full">
                      <Input placeholder="Например, Vietcombank" {...field} value={String(field.value ?? "")} className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="cash" className="mt-4 space-y-4 px-6">
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                Мы доставляем наличные по Данангу и Хойану в течение 15-30 минут.
              </p>
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>
                      Адрес доставки (Дананг/ХойаН) <span className="text-red-500">*</span>
                      <span className="block text-xs text-gray-500 font-normal mt-1">
                        Пожалуйста, укажите как можно больше деталей: название отеля, номер комнаты, точный адрес или ссылку на Google Maps.
                      </span>
                    </FormLabel>
                    <FormControl className="w-full">
                      <Input placeholder="Введите полный адрес доставки" {...field} className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Telegram Contact Field - Always visible */}
        <FormField
          control={form.control}
          name="telegramContact"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>
                Ваш Telegram (для связи) <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl className="w-full">
                <Input placeholder="@ваш_никнейм" {...field} className={inputClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact Phone Field - Now always visible after Telegram */}
        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Контактный телефон</FormLabel>
              <FormControl className="w-full">
                <Input
                  placeholder="Введите ваш номер телефона"
                  {...field}
                  value={String(field.value ?? "")}
                  className={inputClass}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full py-3 text-lg rounded-full 
                     bg-gradient-to-b from-green-400 to-green-700 text-white shadow-xl 
                     hover:from-green-500 hover:to-green-800 transition-all duration-300 ease-in-out"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Обработка...
            </>
          ) : (
            "Обменять сейчас"
          )}
        </Button>
      </form>
    </Form>
  );
}