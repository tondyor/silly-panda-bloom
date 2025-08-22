import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";
import { useTranslation } from 'react-i18next';

interface ExchangeSummaryProps {
  data: any;
  depositInfo: { network: string; address: string; } | null;
}

export const ExchangeSummary: React.FC<ExchangeSummaryProps> = ({ data, depositInfo }) => {
  const { t } = useTranslation();

  if (!data) {
    return null;
  }

  const {
    order_id,
    paymentCurrency,
    fromAmount,
    calculatedVND,
    deliveryMethod,
    vndBankName,
    vndBankAccountNumber,
    deliveryAddress,
    contactPhone,
    usdtNetwork,
  } = data;

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        showSuccess(t("pendingOrders.addressCopied"));
      })
      .catch(err => {
        console.error('Failed to copy address: ', err);
      });
  };

  return (
    <Card className="w-full bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2 pt-4">
        <CardTitle className="text-xl font-bold text-gray-800">
          {t("exchangeSummary.orderCreatedTitle", { orderId: order_id })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm px-4 pb-4">
        <p className="text-center text-gray-600 text-xs">
          {t("exchangeSummary.contactSoon")}
        </p>
        
        {paymentCurrency === 'USDT' && depositInfo && (
          <div className="border-t border-gray-200 pt-2 space-y-2">
            <h3 className="font-semibold text-base text-center text-blue-700">{t("exchangeSummary.depositSectionTitle")}</h3>
            
            <div className="space-y-1 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span>{t("exchangeSummary.networkLabel")}</span>
                <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded">{depositInfo.network}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t("exchangeSummary.amountLabel")}</span>
                <span className="font-semibold">{fromAmount} USDT</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t("exchangeSummary.depositAddressLabel")}</label>
              <div className="flex items-center space-x-1">
                <p className="text-xs font-mono bg-gray-100 p-1.5 rounded-md break-all flex-grow">
                  {depositInfo.address}
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyAddress(depositInfo.address)}>
                  <Copy className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-2">
          <h3 className="font-semibold text-base mb-1 text-gray-700 text-center">{t("exchangeSummary.orderDetailsTitle")}</h3>
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between">
              <span className="text-gray-500">{t("exchangeSummary.youSendLabel")}</span>
              <span className="font-medium text-gray-800">{fromAmount} {paymentCurrency}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">{t("exchangeSummary.youReceiveLabel")}</span>
              <span className="font-medium text-green-600">
                {calculatedVND.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
            </li>
            {paymentCurrency === 'USDT' && (
              <li className="flex justify-between">
                <span className="text-gray-500">{t("exchangeSummary.depositNetworkLabel")}</span>
                <span className="font-medium text-gray-800">{usdtNetwork}</span>
              </li>
            )}
            <li className="flex justify-between">
              <span className="text-gray-500">{t("exchangeSummary.deliveryMethodLabel")}</span>
              <span className="font-medium text-gray-800">
                {deliveryMethod === "bank" ? t("exchangeSummary.deliveryMethodBank") : t("exchangeSummary.deliveryMethodCash")}
              </span>
            </li>
            {deliveryMethod === "bank" && (
              <>
                <li className="flex justify-between">
                  <span className="text-gray-500">{t("exchangeSummary.bankLabel")}</span>
                  <span className="font-medium text-gray-800">{vndBankName}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">{t("exchangeSummary.accountNumberLabel")}</span>
                  <span className="font-medium text-gray-800">{vndBankAccountNumber}</span>
                </li>
              </>
            )}
            {deliveryMethod === "cash" && (
              <li className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0 mr-2">{t("exchangeSummary.deliveryAddressLabel")}</span>
                <span className="font-medium text-gray-800 text-right">{deliveryAddress}</span>
              </li>
            )}
            {contactPhone && (
              <li className="flex justify-between">
                <span className="text-gray-500">{t("exchangeSummary.contactPhoneLabel")}</span>
                <span className="font-medium text-gray-800">{contactPhone}</span>
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-2 space-y-2">
          {paymentCurrency === 'USDT' && depositInfo && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 p-2 text-xs">
              <AlertTriangle className="h-4 w-4 !text-red-800" />
              <AlertTitle className="font-semibold mb-1">{t("exchangeSummary.importantTitle")}</AlertTitle>
              <AlertDescription>
                {t("exchangeSummary.usdtWarning", { network: depositInfo.network })}
              </AlertDescription>
            </Alert>
          )}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 p-2 text-xs">
            <Info className="h-4 w-4 !text-blue-800" />
            <AlertTitle className="font-semibold mb-1">
              {deliveryMethod === 'bank' ? t("exchangeSummary.bankTransferTitle") : t("exchangeSummary.cashDeliveryTitle")}
            </AlertTitle>
            <AlertDescription>
              {deliveryMethod === 'bank'
                ? t("exchangeSummary.bankTransferInfo")
                : t("exchangeSummary.cashDeliveryInfo")}
            </AlertDescription>
          </Alert>
        </div>

      </CardContent>
    </Card>
  );
};