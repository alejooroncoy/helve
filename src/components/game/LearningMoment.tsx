import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AssetAllocation, RiskProfile } from "@/game/types";
import { getAllocationRiskScore, getProfileRiskRange, ASSET_CLASSES } from "@/game/types";

interface Props {
  allocation: AssetAllocation;
  profile: RiskProfile;
  stormChoice: "stay" | "sell" | null;
  result: number;
  onContinue: () => void;
}

const nunito = { fontFamily: "'Nunito', sans-serif" };

const CLASS_COLORS: Record<string, string> = {
  bonds: "hsl(210, 60%, 55%)",
  equity: "hsl(145, 58%, 36%)",
  gold: "hsl(38, 92%, 50%)",
  realEstate: "hsl(25, 70%, 50%)",
  alternatives: "hsl(280, 60%, 55%)",
};

const LearningMoment = ({ allocation, profile, stormChoice, result, onContinue }: Props) => {
  const { t } = useTranslation();

  const riskScore = getAllocationRiskScore(allocation);
  const [minR, maxR] = getProfileRiskRange(profile);
  const isAligned = riskScore >= minR && riskScore <= maxR;
  const isTooAggressive = riskScore > maxR;

  const getInsight = (): { text: string } => {
    if (stormChoice === "sell") return { text: t("learning.sellInsight") };
    if (!isAligned && isTooAggressive) return { text: t("learning.tooAggressiveInsight") };
    if (!isAligned && !isTooAggressive) return { text: t("learning.tooConservativeInsight") };
    if (allocation.equity >= 60) return { text: t("learning.highEquityInsight") };
    if (allocation.bonds >= 50) return { text: t("learning.highBondsInsight") };
    if (stormChoice === "stay") return { text: t("learning.stayInsight") };
    return { text: t("learning.balancedInsight") };
  };

  const insight = getInsight();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 bg-background"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
    >
      <motion.div className="w-16 h-16 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
        <TrendingUp className="w-8 h-8 text-primary" />
      </motion.div>

      <h2 className="text-xl text-foreground text-center mb-4" style={{ ...nunito, fontWeight: 800 }}>
        {t("learning.title")}
      </h2>

      <motion.div
        className="rounded-2xl border-2 p-5 max-w-sm w-full mb-4"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-sm text-foreground leading-relaxed text-center" style={nunito}>{insight.text}</p>
      </motion.div>

      <motion.div
        className="rounded-2xl border-2 p-4 max-w-sm w-full mb-6"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-xs text-muted-foreground mb-2 text-center" style={{ ...nunito, fontWeight: 700 }}>
          {t("learning.yourAllocation")}
        </p>
        <div className="flex gap-1 h-4 rounded-full overflow-hidden mb-2">
          {ASSET_CLASSES.filter(c => allocation[c.key] > 0).map(c => (
            <div key={c.key} style={{ width: `${allocation[c.key]}%`, backgroundColor: CLASS_COLORS[c.key] }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {ASSET_CLASSES.filter(c => allocation[c.key] > 0).map(c => (
            <span key={c.key} className="text-[10px] text-muted-foreground" style={nunito}>
              {allocation[c.key]}%
            </span>
          ))}
        </div>
        <p className="text-xs text-center mt-2" style={{ ...nunito, color: isAligned ? "hsl(var(--primary))" : "hsl(38, 92%, 50%)" }}>
          {t("learning.riskScore", { score: riskScore.toFixed(1) })} — {isAligned ? t("learning.aligned") : t("learning.misaligned")}
        </p>
      </motion.div>

      <motion.button
        onClick={onContinue}
        className="w-full max-w-sm py-4 rounded-2xl tracking-widest text-sm"
        style={{ ...nunito, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: 900 }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {t("learning.continue")}
      </motion.button>
    </motion.div>
  );
};

export default LearningMoment;
