import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ExchangePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="relative bg-white text-black p-4">
          <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20">
            <LanguageSwitcher />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* existing content */}
        </CardContent>
        <CardFooter className="p-4">
          {/* existing footer */}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ExchangePage;