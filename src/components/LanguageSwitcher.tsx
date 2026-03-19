import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("es") ? "es" : "en";

  const toggle = () => {
    const next = current === "en" ? "es" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <motion.button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card shadow-sm border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors ${className}`}
      whileTap={{ scale: 0.95 }}
    >
      <Globe className="w-3.5 h-3.5" />
      {current === "en" ? "ES" : "EN"}
    </motion.button>
  );
}
