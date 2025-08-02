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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Hypothetical official rate (for demonstration purposes)
const OFFICIAL_USDT_VND_RATE = 25000; // 1 USDT = 25,000 VND
const PROFIT_MARGIN = 0.005; // 0.5% better

const formSchema = z.object({
  usdtAmount: z.coerce
    .number()
    .min(10, "Минимальная сумма обмена 10 USDT.")
    .max(100000, "Максимальная сумма обмена 100,000 USDT."),
  vndBankAccountNumber: z
    .string()
    .min(8, "Номер счета должен содержать не менее 8 символов.")
    .max(20, "Номер счета должен содержать не более 20 символов.")
    .regex(/^\d+$/, "Номер счета должен содержать только цифры."),
  vndBankName: z
    .string()
    .min(2, "Название банка должно содержать не менее 2 символов.")
    .max(50, "Название банка должно содержать не более 50 символов."),
  usdtWalletAddress: z
    .string()
    .min(30, "Адрес кошелька USDT должен содержать не менее 30 символов.")
    .max(60, "Адрес кошелька USDT должен содержать не более 60 символов.")
    .regex(/^(0x)?[0-9a-fA-F]{30,60}$/, "Неверный формат адреса USDT кошелька."),
});

export function ExchangeForm() {
  const [calculatedVND, setCalculatedVND] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usdtAmount: 100, // Default value for demonstration
      vndBankAccountNumber: "",
      vndBankName: "",
      usdtWalletAddress: "",
    },
  });

  const usdtAmount = form.watch("usdtAmount");

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
    toast.loading("Обработка вашего запроса на обмен...");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // In a real application, you would send `values` to your backend
      // and handle the actual exchange process.
      console.log("Exchange request submitted:", values);
      console.log("Calculated VND:", calculatedVND);

      toast.success("Ваш запрос на обмен успешно отправлен!", {
        description: `Вы обменяли ${values.usdtAmount} USDT на ${calculatedVND.toLocaleString('vi-VN')} VND.`,
      });
      form.reset(); // Clear form after successful submission
      setCalculatedVND(0);
    } catch (error) {
      console.error("Exchange failed:", error);
      toast.error("Ошибка при обработке обмена.", {
        description: "Пожалуйста, попробуйте еще раз или свяжитесь с поддержкой.",
      });
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
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? "" : value);
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

        <FormField
          control={form.control}
          name="vndBankAccountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Номер банковского счета VND</FormLabel>
              <FormControl>
                <Input placeholder="Введите номер счета" {...field} className="p-3" />
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
        <FormField
          control={form.control}
          name="usdtWalletAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ваш адрес кошелька USDT (для отправки)</FormLabel>
              <FormControl>
                <Input placeholder="Введите адрес вашего USDT кошелька" {...field} className="p-3" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
        <p className="text-center text-sm text-gray-500 mt-4">
          Нажимая "Обменять сейчас", вы соглашаетесь с нашими условиями.
        </p>
      </form>
    </Form>
  );
}