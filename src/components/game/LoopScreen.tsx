import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AssetAllocation, RiskProfile } from "@/game/types";
import TreeSVG from "./TreeSVG";

const nunito = { fontFamily: "'Nunito', sans-serif" };

interface Props {
  result: number;
  allocation: AssetAllocation;
  profile: RiskProfile;
  stormChoice: "stay" | "sell" | null;
  onTryAgain: () => void;
  onAdjust: () => void;
}

const LoopScreen = ({ result, allocation, profile, stormChoice, onTryAgain, onAdjust }: Props) => {
  const treeStage = result >= 130 ? "large" : result >= 115 ? "medium" : "small";
  const { t, i18n } = useTranslation();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const lang = i18n.language?.startsWith("es") ? "es" : "en";
        const decision = stormChoice === "sell" ? "sell" : "hold";

        const allocDesc = Object.entries(allocation)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${k}: ${v}%`)
          .join(", ");

        const { data, error } = await supabase.functions.invoke("decision-feedback", {
          body: {
            language: lang,
            eventTitle: lang === "es" ? "Tormenta de Mercado" : "Market Storm",
            eventDesc: lang === "es"
              ? `Portafolio: ${allocDesc}. Perfil de riesgo: ${profile}. Una caída del mercado ocurrió durante la simulación.`
              : `Portfolio: ${allocDesc}. Risk profile: ${profile}. A market downturn occurred during the simulation.`,
            decision,
            holdImpact: 0.85,
            sellImpact: 0.95,
            balanceBefore: 100,
            balanceAfter: result,
          },
        });

        if (error) throw error;
        setFeedback(data?.feedback || null);
      } catch (e) {
        console.error("Feedback error:", e);
        setFeedback(null);
      } finally {
        setLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [allocation, profile, stormChoice, result, i18n.language]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <TreeSVG stage={treeStage} />

      <motion.div
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-serif text-foreground">{t("loop.title")}</h2>
        <p className="text-lg text-muted-foreground mt-2">
          {t("loop.finalValue")}: <span className="font-medium text-primary">{result}</span>
        </p>
      </motion.div>

      {/* AI Feedback */}
      <motion.div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {loadingFeedback ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground" style={nunito}>
              {i18n.language?.startsWith("es") ? "Analizando tu decisión..." : "Analyzing your decision..."}
            </span>
          </div>
        ) : feedback ? (
          <p className="text-sm text-foreground leading-relaxed text-center" style={nunito}>
            {feedback}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center" style={nunito}>
            {t("loop.tryAgainPrompt")}
          </p>
        )}
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 w-full max-w-xs"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          className="bg-primary text-primary-foreground p-5 rounded-3xl text-lg font-medium shadow-lg"
          onClick={onTryAgain}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {t("loop.tryAgain")}
        </motion.button>
        <motion.button
          className="bg-card text-foreground p-5 rounded-3xl text-lg font-medium shadow-sm border border-border"
          onClick={onAdjust}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {t("loop.adjust")}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default LoopScreen;
