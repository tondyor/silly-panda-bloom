import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const steps = [
  {
    titleKey: 'howItWorks.step1',
    descriptionKey: 'howItWorks.step1Description',
  },
  {
    titleKey: 'howItWorks.step2',
    descriptionKey: 'howItWorks.step2Description',
  },
  {
    titleKey: 'howItWorks.step3',
    descriptionKey: 'howItWorks.step3Description',
  },
];

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden relative z-10 bg-black/50 backdrop-blur-sm border-2 border-white/10 mt-4">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-xl font-bold text-center text-white">{t('howItWorks.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 h-8 w-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-base">
              {index + 1}
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-white">{t(step.titleKey)}</h3>
              <p className="text-xs text-gray-200">{t(step.descriptionKey)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};