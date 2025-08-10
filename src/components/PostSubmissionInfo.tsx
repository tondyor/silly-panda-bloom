import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PostSubmissionInfoProps {
  depositInfo: { network: string; address: string } | null;
  formData:
    | {
        paymentCurrency: string;
        // другие поля по необходимости
      }
    | null;
}

export const PostSubmissionInfo: React.FC<PostSubmissionInfoProps> = ({
  depositInfo,
  formData,
}) => {
  if (!formData) return null;

  const { paymentCurrency } = formData;
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 mt-6">
      {paymentCurrency === "USDT" && depositInfo && (
        <Card className="w-full bg-white/80 backdrop-blur-sm border-2 border-brand-blue">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-brand-blue">
              Пополнение
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert
              variant="destructive"
              className="bg-brand-blue/10 border-brand-blue text-brand-blue"
            >
              <AlertTriangle className="h-4 w-4 !text-brand-blue" />
              <AlertTitle className="font-semibold text-brand-blue">
                Важно!
              </AlertTitle>
              <AlertDescription className="text-brand-blue">
                Отправляйте только USDT в сети {depositInfo.network}.
              </AlertDescription>
            </Alert>
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-1">
                Адрес для пополнения:
              </label>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-mono bg-gray-100 p-2 rounded-md break-all flex-grow">
                  {depositInfo.address}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-brand-blue hover:text-brand-accent"
                  onClick={() => handleCopyAddress(depositInfo.address)}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* остальной PostSubmissionInfo без изменений */}
    </div>
  );
};