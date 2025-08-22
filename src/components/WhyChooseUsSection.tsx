import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, TrendingUp, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const features = [
  {
    icon: <Zap className="h-6 w-6 text-yellow-400" />,
    titleKey: 'whyChooseUs.fast',
    descriptionKey: 'whyChooseUs.fastDescription',
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-green-400" />,
    titleKey: 'whyChooseUs.profitable',
    descriptionKey: 'whyChooseUs.profitableDescription',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-blue-400" />,
    titleKey: 'whyChooseUs.reliable',
    descriptionKey: 'whyChooseUs.reliableDescription',
  },
];

export const WhyChooseUsSection = () => {
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden relative z-10 bg-black/50 backdrop-blur-sm border-2 border-white/10 mt-4">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-xl font-bold text-center text-white">{t('whyChooseUs.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-white">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 p-2 bg-white/20 rounded-full">
              {feature.icon}
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold">{t(feature.titleKey)}</h3>
              <p className="text-xs text-gray-200">{t(feature.descriptionKey)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};