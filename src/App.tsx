import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ExchangePage from "./pages/ExchangePage";
import AccountPage from "./pages/AccountPage";
import { Toaster } from "@/components/ui/sonner";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect, useState } from "react";
import i18n from "./i18n";

const queryClient = new QueryClient();

const App = () => {
  const { data: telegramData, isLoading: isTelegramLoading } = useTelegram();
  // This state is used to force a re-render of the entire app when the language changes.
  const [, setLanguage] = useState(i18n.language);

  useEffect(() => {
    // Set the initial language based on the user's Telegram settings
    if (!isTelegramLoading && telegramData?.user?.language_code) {
      const tgLang = telegramData.user.language_code.split('-')[0];
      if (i18n.language !== tgLang) {
        i18n.changeLanguage(tgLang);
      }
    }

    // Create a listener that updates the state when the language changes
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);
    };

    // Subscribe to the 'languageChanged' event
    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup the subscription when the component unmounts
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
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