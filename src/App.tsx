import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ExchangePage from "./pages/ExchangePage";
import AccountPage from "./pages/AccountPage";
import { Toaster } from "@/components/ui/sonner";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect } from "react";
import i18n from "./i18n";

const queryClient = new QueryClient();

const App = () => {
  const { data: telegramData, isLoading: isTelegramLoading } = useTelegram();

  useEffect(() => {
    if (!isTelegramLoading && telegramData?.user?.language_code) {
      const tgLang = telegramData.user.language_code.split('-')[0]; // Use only the base language code (e.g., 'en' from 'en-US')
      if (i18n.language !== tgLang) {
        i18n.changeLanguage(tgLang);
      }
    }
  }, [telegramData, isTelegramLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ExchangePage />} />
            <Route path="/account" element={<AccountPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;