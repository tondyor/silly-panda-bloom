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
      <CardContent className="space-y-6 p-6 text-white">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className="flex-shrink-0 p-3 bg-white/20 rounded-full">
              {feature.icon}
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-gray-200">{feature.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};