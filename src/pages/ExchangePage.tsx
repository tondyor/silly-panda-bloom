"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { useTranslation } from 'react-i18next';

export default function ExchangePage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <img
              src="/images/LOGO1.png"
              alt={t("headerTitle")}
              className="mx-auto h-16 sm:h-20"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* остальное содержимое страницы */}
        </CardContent>
      </Card>
    </div>
  );
}