import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ExchangeForm } from "@/components/ExchangeForm";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export default function ExchangePage() {
  const [showWallet, setShowWallet] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{
    network: string;
    address: string;
    deliveryMethod: string;
    formData: any;
    loadingToastId: string;
  } | null>(null);

  function handleExchangeSuccess(
    network: string,
    address: string,
    deliveryMethod: string,
    formData: any,
    loadingToastId: string
  ) {
    setShowWallet(true);
    setWalletInfo({ network, address, deliveryMethod, formData, loadingToastId });
    toast.success("Заявка на обмен успешно создана!", {
      description: "Следуйте дальнейшим инструкциям.",
      duration: 4000,
    });
    toast.dismiss(loadingToastId);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-yellow-100 to-green-100 py-8 px-2">
      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-6">
          <CardTitle className="text-4xl font-extrabold text-center mb-2 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            VietSwap
          </CardTitle>
          <div className="text-center text-lg font-medium text-white/90 drop-shadow">
            Моментальный обмен USDT на VND
          </div>
        </CardHeader>
        {/* Кнопки TabsList должны быть прямо под CardHeader и упираться в края Card */}
        <div className="-mx-0">
          {/* Внутри ExchangeForm уже реализован TabsList, который теперь не должен иметь gap, padding, margin, rounded */}
          <ExchangeForm onExchangeSuccess={handleExchangeSuccess} />
        </div>
        {showWallet && walletInfo && (
          <CardContent className="pt-4 pb-6 px-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="font-semibold mb-2">
                Переведите USDT на адрес ({walletInfo.network}):
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono break-all">{walletInfo.address}</span>
                <button
                  className="ml-2 p-1 rounded hover:bg-green-100"
                  onClick={() => {
                    navigator.clipboard.writeText(walletInfo.address);
                    toast.success("Адрес скопирован!");
                  }}
                  title="Скопировать адрес"
                >
                  <Copy size={18} />
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                После перевода USDT, пожалуйста, ожидайте подтверждения.
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}