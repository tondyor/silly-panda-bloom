import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, TrendingUp, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export const WhyChooseUsSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Zap className="h-8 w-8 text-yellow-400" />,
      title: t('whyChooseUs.fast'),
      description: t('whyChooseUs.fastDescription'),
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-400" />,
      title: t('whyChooseUs.profitable'),
      description: t('whyChooseUs.profitableDescription'),
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-blue-400" />,
      title: t('whyChooseUs.reliable'),
      description: t('whyChooseUs.reliableDescription'),
    },
  ];

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden relative z-10 bg-black/50 backdrop-blur-sm border-2 border-white/10 mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-white">{t('whyChooseUs.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-white p-6">
        {features.map((feature, index) => (
          <div key={index} className="flex flex-col items-center space-y-2">
            <div className="p-3 bg-white/20 rounded-full">{feature.icon}</div>
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-gray-200">{feature.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};