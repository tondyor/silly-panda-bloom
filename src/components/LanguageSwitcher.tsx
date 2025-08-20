import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "ru", name: "Русский" },
  { code: "en", name: "English" },
  { code: "vi", name: "Tiếng Việt" },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguageCode = i18n.language.split('-')[0]; // Handles cases like 'en-US'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-auto px-2 py-0 text-base font-bold text-white hover:bg-white/20 hover:text-white focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {currentLanguageCode.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-sm border-gray-300">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => changeLanguage(lang.code)}
            className="cursor-pointer focus:bg-gray-200"
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};