import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const nunito = { fontFamily: "'Nunito', sans-serif" };

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState(
    i18n.language?.startsWith("es") ? "es" : "en"
  );

  useEffect(() => {
    const onLangChange = (lng: string) => {
      setCurrent(lng.startsWith("es") ? "es" : "en");
    };
    i18n.on("languageChanged", onLangChange);
    return () => i18n.off("languageChanged", onLangChange);
  }, [i18n]);

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrent(lang);
  };

  return (
    <div className={`flex items-center gap-1 bg-card shadow-sm border border-border rounded-full px-2 py-1 ${className}`}>
      <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1" />
      {["en", "es"].map((lang) => (
        <button
          key={lang}
          onClick={() => handleChange(lang)}
          className="px-2 py-0.5 rounded-full text-xs font-bold transition-colors"
          style={{
            ...nunito,
            backgroundColor: current === lang ? "#5BB8F5" : "transparent",
            color: current === lang ? "white" : "hsl(var(--muted-foreground))",
          }}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
