import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import clsx from "clsx";

const languages = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
  { code: "vi", name: "VI" },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <>
      <div className="hidden sm:flex items-center space-x-1 bg-white/70 backdrop-blur-sm rounded-full p-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant="ghost"
            size="sm"
            onClick={() => changeLanguage(lang.code)}
            className={clsx(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors text-blue-700 hover:bg-blue-100",
              {
                "bg-blue-200 text-blue-800":
                  i18n.language.startsWith(lang.code),
              }
            )}
          >
            {lang.name}
          </Button>
        ))}
      </div>
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-700 bg-white/70 backdrop-blur-sm rounded-full"
            >
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={clsx({
                  "font-bold": i18n.language.startsWith(lang.code),
                })}
              >
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

export default LanguageSwitcher;