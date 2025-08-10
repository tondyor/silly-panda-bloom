import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

const languages = [
  { code: 'ru', name: 'RU' },
  { code: 'en', name: 'ENG' },
  { code: 'vi', name: 'VIET' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant="ghost"
          size="sm"
          onClick={() => changeLanguage(lang.code)}
          className={`p-1 h-auto text-xs font-bold text-white transition-opacity rounded-md ${
            i18n.language.startsWith(lang.code) ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          {lang.name}
        </Button>
      ))}
    </div>
  );
};