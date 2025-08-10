import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
import LanguageSwitcher from "@/components/LanguageSwitcher";

const formSchema = z.object({
  fromCurrency: z.string(),
  fromAmount: z.coerce.number().positive(),
  toCurrency: z.string(),
  toAmount: z.coerce.number().positive(),
});

const ExchangePage = () => {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromCurrency: "BTC",
      fromAmount: 1,
      toCurrency: "USDT",
      toAmount: 50000,
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    console.log(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-900 dark:to-black flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="relative p-0">
          <img src="/logo.jpg" alt="Logo" className="w-full h-auto" />
          <div className="absolute top-2 right-2 z-10">
            <LanguageSwitcher />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form
              id="exchange-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="fromAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-600 font-semibold">
                        {t("you_send")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-white/50 border-2 border-gray-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fromCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white/50 border-2 border-gray-300">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                          <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="toAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-600 font-semibold">
                        {t("you_get")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-white/50 border-2 border-gray-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white/50 border-2 border-gray-300">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USDT">Tether (USDT)</SelectItem>
                          <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            form="exchange-form"
            className="w-full bg-red-600 hover:bg-red-700 text-lg py-6 rounded-xl font-bold"
          >
            {t("exchange_now")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ExchangePage;