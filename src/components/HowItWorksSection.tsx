import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      title: t('howItWorks.step1'),
      description: t('howItWorks.step1Description'),
    },
    {
      title: t('howItWorks.step2'),
      description: t('howItWorks.step2Description'),
    },
    {
      title: t('howItWorks.step3'),
      description: t('howItWorks.step3Description'),
    },
  ];

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden relative z-10 bg-white/10 backdrop-blur-sm border-2 border-white/20 mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-white">{t('howItWorks.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className="flex-shrink-0 h-10 w-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {index + 1}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-gray-200">{step.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};