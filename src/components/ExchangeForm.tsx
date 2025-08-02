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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Hypothetical official rate (for demonstration purposes)
const OFFICIAL_USDT_VND_RATE = 25000; // 1 USDT = 25,000 VND
const PROFIT_MARGIN = 0.005; // 0.5% better

// USDT Wallet Addresses
const USDT_WALLETS: Record<string, string> = {
  "BEP20": "0x66095f5be059C3C3e1f44416aEAd8085B8F42F3e",
  "TON": "UQCgn4ztELQZLiGWTtOFcZoN22Lf4B6Vd7IO6WsBZuXM8edg",
  "TRC20": "TAAQEjDBQK5hN1MGumVUjtzX42qRYCjTkB",
  "ERC20": "0x54C7fA815AE5a5DDEd5DAa4A36CFB6903cE7D896",
  "SPL": "9vBe1AP3197jP4PSjC2jUsyadr82Sey3nXbxAT3LSQwm",
};

const commonFields = {
  usdtAmount: z.coerce
    .number()
    .min(100, "Минимальная сумма обмена 100 USDT.")
    .max(100000, "Максимальная сумма обмена 100,000 USDT."),
  telegramContact: z
    .string()
    .min(3, "Имя пользователя Telegram должно содержать не менее 3 символов.")
    .max(32, "Имя пользователя Telegram должно содержать не более 32 символов.")
    .regex(/^@[a-zA-Z0-9_]{3,32}$/, "Неверный формат имени пользователя Telegram (начните с @)."),
  usdtNetwork: z.enum([
    "BEP20",
    "TRC20",
    "ERC20",
    "TON",
    "SPL"
  ], { required_error: "Пожалуйста, выберите сеть USDT." }),
};

const formSchema = z.discriminatedUnion("deliveryMethod", [
  z.object({
    deliveryMethod: z.literal('bank'),
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
    deliveryMethod: z.literal('cash'),
    ...commonFields,
    deliveryAddress: z
      .string()
      .min(10, "Адрес доставки должен быть подробным.")
      .max(200, "Адрес доставки слишком длинный."),
    contactPhone: z
      .string()
      .min(10, "Номер телефона должен содержать не менее 10 цифр.")
      .max(15, "Номер телефона должен содержать не более 15 цифр.")
      .regex(/^\+?\d{10,15}$/, "Неверный формат номера телефона."),
  }),
]);

interface ExchangeFormProps {
  onExchangeSuccess: (network: string, address: string, deliveryMethod: 'bank' | 'cash', formData: any, loadingToastId: string) => void;
}

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usdtAmount: 100, // Default value for demonstration
      deliveryMethod: 'bank', // Default to bank transfer
      telegramContact: "@", // Default value for Telegram
      usdtNetwork: "TRC20", // Default USDT network
      vndBankAccountNumber: "",
      vndBankName: "",
    },
  });

  const usdtAmount = form.watch("usdtAmount");
  const deliveryMethod = form.watch("deliveryMethod"); // Watch the delivery method
  const usdtNetwork = form.watch("usdtNetwork"); // Watch the selected USDT network

  useEffect(() => {
    const rate = OFFICIAL_USDT_VND_RATE * (1 + PROFIT_MARGIN);
    setExchangeRate(rate);
    if (usdtAmount && typeof usdtAmount === 'number' && usdtAmount > 0) {
      setCalculatedVND(usdtAmount * rate);
    } else {
      setCalculatedVND(0);
    }
  }, [usdtAmount]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const loadingToastId = toast.loading("Обработка вашего запроса на обмен...", {
      className: "opacity-75", // Apply semi-transparency to the loading toast
    });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      console.log("Exchange request submitted:", values);
      console.log("Calculated VND:", calculatedVND);
      
      // Get the USDT deposit address based on the selected network
      const depositAddress = USDT_WALLETS[values.usdtNetwork];
      if (depositAddress) {
        onExchangeSuccess(values.usdtNetwork, depositAddress, values.deliveryMethod, { ...values, calculatedVND, exchangeRate }, loadingToastId); // Pass loadingToastId
      } else {
        console.warn(`No deposit address found for network: ${values.usdtNetwork}`);
        onExchangeSuccess(values.usdtNetwork, "Адрес не найден. Пожалуйста, свяжитесь с поддержкой.", values.deliveryMethod, { ...values, calculatedVND, exchangeRate }, loadingToastId); // Pass loadingToastId
      }

      // Reset form based on the current delivery method
      if (deliveryMethod === 'bank') {
        form.reset({
          usdtAmount: 100, // Keep as number, as schema expects number
          deliveryMethod: 'bank',
          telegramContact: "@",
          usdtNetwork: "TRC20", // Reset network
          vndBankAccountNumber: "",
          vndBankName: "",
        });
      } else { // deliveryMethod === 'cash'
        form.reset({
          usdtAmount: 100, // Keep as number, as schema expects number
          deliveryMethod: 'cash',
          telegramContact: "@",
          usdtNetwork: "TRC20", // Reset network
          deliveryAddress: "",
          contactPhone: "",
        });
      }
      setCalculatedVND(0);
    } catch (error) {
      console.error("Exchange failed:", error);
      toast.error("Ошибка при обработке обмена.", {
        description: "Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.",
        duration: 5000, // Error toasts can disappear after 5 seconds
      });
      toast.dismiss(loadingToastId); // Dismiss loading toast on error
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="usdtAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Сумма USDT</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Введите сумму USDT"
                    {...field}
                    // Ensure field.onChange receives a number
                    onChange={(e) => {
                      const value = e.target.value;
                      // Parse to float. If empty string or invalid, parseFloat returns NaN.
                      // Zod's coerce.number().min(100) will then handle validation for NaN.
                      field.onChange(parseFloat(value));
                    }}
                    className="text-lg p-3"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col justify-end">
            <Label className="mb-2">Вы получите (VND)</Label>
            <Input
              type="text"
              value={calculatedVND.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
              readOnly
              className="bg-gray-100 font-bold text-green-700 text-lg p-3"
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          Текущий курс: 1 USDT = <span className="font-semibold text-blue-600">{exchangeRate.toLocaleString('vi-VN')} VND</span>
        </div>

        {/* USDT Network Selection */}
        <FormField
          control={form.control}
          name="usdtNetwork"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Сеть USDT</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="p-3">
                    <SelectValue placeholder="Выберите сеть USDT" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BEP20">BSC (BEP20)</SelectItem>
                  <SelectItem value="TRC20">TRX (TRC20)</SelectItem>
                  <SelectItem value="ERC20">ETH (ERC20)</SelectItem>
                  <SelectItem value="TON">TON (TON)</SelectItem>
                  <SelectItem value="SPL">SOL (SPL)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery Method Toggle */}
        <FormField
          control={form.control}
          name="deliveryMethod"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Способ получения VND</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="bank" />
                    </FormControl>
                    <Label className="font-normal">
                      На банковский счет
                    </Label>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="cash" />
                    </FormControl>
                    <Label className="font-normal">
                      Наличными (доставка)
                    </Label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Telegram Contact Field - Always visible */}
        <FormField
          control={form.control}
          name="telegramContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ваш Telegram (для связи)</FormLabel>
              <FormControl>
                <Input placeholder="@ваш_никнейм" {...field} className="p-3" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {deliveryMethod === 'bank' && (
          <>
            <FormField
              control={form.control}
              name="vndBankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер карты или счета VND</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите номер карты или счета" {...field} className="p-3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vndBankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название банка VND</FormLabel>
                  <FormControl>
                    <Input placeholder="Например, Vietcombank" {...field} className="p-3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {deliveryMethod === 'cash' && (
          <>
            <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
              Мы доставляем наличные по Данангу и Хойану в течение 15-30 минут.
            </p>
            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Адрес доставки (Дананг/Хойан)</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите полный адрес доставки" {...field} className="p-3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Контактный телефон</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите ваш номер телефона" {...field} className="p-3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
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