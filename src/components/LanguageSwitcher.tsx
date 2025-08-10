"use client";

import React from "react";
import { Button } from "@/components/ui/button";

const languages = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  // добавьте другие языки при необходимости
];

export default function LanguageSwitcher() {
  return (
    <div className="flex space-x-2">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant="ghost"
          size="sm"
          className="text-white"
        >
          {lang.label}
        </Button>
      ))}
    </div>
  );
}