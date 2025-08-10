"use client";

import React from "react";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex space-x-2">
      <button
        className="text-blue-500 font-medium hover:underline w-10 py-1 text-center"
        onClick={() => changeLanguage("en")}
      >
        EN
      </button>
      <button
        className="text-blue-500 font-medium hover:underline w-10 py-1 text-center"
        onClick={() => changeLanguage("ru")}
      >
        RU
      </button>
      <button
        className="text-blue-500 font-medium hover:underline w-10 py-1 text-center"
        onClick={() => changeLanguage("vi")}
      >
        VI
      </button>
    </div>
  );
};