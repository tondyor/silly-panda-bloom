"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const exchangeFormSchema = z.object({
  fromAmount: z.string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be a positive number"),
  paymentCurrency: z.string({
    required_error: "Please select a currency.",
  }),
  deliveryMethod: z.string({
    required_error: "Please select a delivery method.",
  }),
  telegramContact: z.string().min(1, "Telegram contact is required."),
  contactPhone: z.string().optional(),
  vndBankName: z.string().optional(),
  vndBankAccountNumber: z.string().optional(),
  deliveryAddress: z.string().optional(),
  usdtNetwork: z.string().optional(),
});

type ExchangeFormValues = z.infer<typeof exchangeFormSchema>;

const MOCK_EXCHANGE_RATE_USDT_VND = 25400;
// TODO: Замените этот адрес на ваш реальный кошелек USDT.
// Этот адрес будет показан пользователям для отправки платежей.
const PAYMENT_WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";

interface ExchangeFormProps {
  onExchangeSuccess: (network: string, address: string, orderData: any, loadingToastId: string | number) => void;
}

export function ExchangeForm({ onExchangeSuccess }: ExchangeFormProps) {
  const { t } = useTranslation();
  const [calculatedVnd, setCalculatedVnd] = useState("0");

  const form = useForm<ExchangeFormValues>({
    resolver: zodResolver(exchangeFormSchema),
    defaultValues: {
      fromAmount: "100",
      paymentCurrency: "USDT",
      deliveryMethod: "bank_transfer",
      telegramContact: "",
      contactPhone: "",
      vndBankName: "",
      vndBankAccountNumber: "",
      deliveryAddress: "",
      usdtNetwork: "TRC20",
    },
  });

  const fromAmount = form.watch("fromAmount");
  const deliveryMethod = form.watch("deliveryMethod");

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      const result = amount * MOCK_EXCHANGE_RATE_USDT_VND;
      setCalculatedVnd(result.toLocaleString("vi-VN"));
    } else {
      setCalculatedVnd("0");
    }
  }, [fromAmount]);

  async function onSubmit(data: ExchangeFormValues) {
    const loadingToastId = toast.loading(t("toasts.creatingOrder", "Создание заявки..."));

    try {
      const { data: orderIdData, error: orderIdError } = await supabase.rpc('get_next_order_id');

      if (orderIdError) {
        console.error("Error getting next order ID:", orderIdError);
        toast.error(t("toasts.orderIdError", "Не удалось сгенерировать ID заявки. Пожалуйста, попробуйте еще раз."), { id: loadingToastId });
        return;
      }
      
      const public_id = `VEX-${String(orderIdData).padStart(6, '0')}`;

      const orderPayload = {
        public_id,
        payment_currency: data.paymentCurrency,
        from_amount: Number(data.fromAmount),
        calculated_vnd: parseFloat(calculatedVnd.replace(/,/g, '')),
        exchange_rate: MOCK_EXCHANGE_RATE_USDT_VND,
        delivery_method: data.deliveryMethod,
        vnd_bank_name: data.vndBankName,
        vnd_bank_account_number: data.vndBankAccountNumber,
        delivery_address: data.deliveryAddress,
        telegram_contact: data.telegramContact,
        contact_phone: data.contactPhone,
        usdt_network: data.usdtNetwork,
      };

      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        toast.error(t("toasts.orderCreationError", "Не удалось создать заявку. Проверьте данные и попробуйте снова."), { id: loadingToastId });
        return;
      }

      if (data.usdtNetwork) {
        onExchangeSuccess(data.usdtNetwork, PAYMENT_WALLET_ADDRESS, newOrder, loadingToastId);
      } else {
        toast.error(t("toasts.networkMissingError", "Сеть USDT не выбрана. Невозможно продолжить."), { id: loadingToastId });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(t("toasts.unexpectedError", "Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже."), { id: loadingToastId });
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>{t("exchangeForm.title", "Создать заявку")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fromAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("exchangeForm.fromAmountLabel", "Сумма к отправке")}</FormLabel>
                    <div className="flex items-start gap-2">
                      <FormControl className="w-full">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={t("exchangeForm.amountPlaceholder", "100")}
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <div className="p-2 h-10 border rounded-md bg-muted text-muted-foreground whitespace-nowrap flex items-center">
                        USDT
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>{t("exchangeForm.toAmountLabel", "Сумма к получению")}</FormLabel>
                <div className="flex items-start gap-2">
                  <div className="w-full p-2 h-10 border rounded-md bg-muted flex items-center">
                    {calculatedVnd}
                  </div>
                  <div className="p-2 h-10 border rounded-md bg-muted text-muted-foreground whitespace-nowrap flex items-center">
                    VND
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pt-2">
                  {t("exchangeForm.rateInfo", `Курс: 1 USDT ≈ ${MOCK_EXCHANGE_RATE_USDT_VND.toLocaleString("vi-VN")} VND`)}
                </p>
              </FormItem>
            </div>

            <FormField
              control={form.control}
              name="deliveryMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("exchangeForm.deliveryMethodLabel", "Способ получения")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("exchangeForm.deliveryMethodPlaceholder", "Выберите способ")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        {t("exchangeForm.deliveryMethods.bank_transfer", "Перевод на карту")}
                      </SelectItem>
                      <SelectItem value="cash_delivery">
                        {t("exchangeForm.deliveryMethods.cash_delivery", "Наличными")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {deliveryMethod === "bank_transfer" && (
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="vndBankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("exchangeForm.bankNameLabel", "Название банка")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("exchangeForm.bankNamePlaceholder", "Например, VPBank")} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vndBankAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("exchangeForm.accountNumberLabel", "Номер счета")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("exchangeForm.accountNumberPlaceholder", "123456789")} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {deliveryMethod === "cash_delivery" && (
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("exchangeForm.addressLabel", "Адрес доставки")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("exchangeForm.addressPlaceholder", "Город и адрес")} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="telegramContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("exchangeForm.telegramLabel", "Контакт в Telegram")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("exchangeForm.telegramPlaceholder", "@username")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("exchangeForm.submittingButton", "Отправка...") : t("exchangeForm.submitButton", "Отправить")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}