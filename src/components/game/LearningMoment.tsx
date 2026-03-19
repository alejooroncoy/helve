import { motion } from "framer-motion";
import type { PortfolioSlot } from "@/game/types";
import { useTranslation } from "react-i18next";

interface Props {
  portfolio: PortfolioSlot[];
  stormChoice: "stay" | "sell" | null;
  result: number;
  onContinue: () => void;
}

const LearningMoment = ({ portfolio, stormChoice, result, onContinue }: Props) => {
  const { t } = useTranslation();

  const getInsight = (): { emoji: string; text: string } => {
    if (stormChoice === "sell") return { emoji: "🌱", text: t("learning.sellInsight") };
    const growthCount = portfolio.filter((s) => s === "growth").length;
    const safeCount = portfolio.filter((s) => s === "safe").length;
    if (growthCount === 3) return { emoji: "🎢", text: t("learning.allGrowthInsight") };
    if (safeCount === 3) return { emoji: "🐢", text: t("learning.allSafeInsight") };
    if (stormChoice === "stay") return { emoji: "🌿", text: t("learning.stayInsight") };
    return { emoji: "✨", text: t("learning.balancedInsight") };
  };

  const insight = getInsight();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.span
        className="text-6xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
      >
        {insight.emoji}
      </motion.span>

      <motion.div
        className="bg-card p-8 rounded-3xl shadow-sm max-w-sm text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-serif text-foreground mb-3">{t("learning.title")}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{insight.text}</p>
      </motion.div>

      <motion.button
        className="bg-primary text-primary-foreground px-10 py-4 rounded-4xl text-lg font-medium shadow-lg"
        onClick={onContinue}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {t("learning.continue")}
      </motion.button>
    </motion.div>
  );
};

export default LearningMoment;
