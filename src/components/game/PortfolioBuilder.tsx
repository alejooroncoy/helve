import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Investment, PortfolioSlot } from "@/game/types";
import { availableInvestments } from "@/game/types";

interface Props {
  profile: string;
  onComplete: (portfolio: PortfolioSlot[], investments: Investment[]) => void;
}

function getSuggestions(profile: string, active: Investment[]): Investment[] {
  const activeIds = new Set(active.map((i) => i.id));
  const pool = availableInvestments.filter((i) => !activeIds.has(i.id));

  if (profile === "conservative") {
    return pool.sort((a, b) => a.riskLevel - b.riskLevel).slice(0, 4);
  } else if (profile === "growth") {
    return pool.sort((a, b) => b.annualReturn - a.annualReturn).slice(0, 4);
  }
  return pool.sort((a, b) => Math.abs(5 - a.riskLevel) - Math.abs(5 - b.riskLevel)).slice(0, 4);
}

function getRiskColor(risk: number): string {
  if (risk <= 3) return "text-primary";
  if (risk <= 6) return "text-accent";
  return "text-destructive";
}

const PortfolioBuilder = ({ profile, onComplete }: Props) => {
  const [activePortfolio, setActivePortfolio] = useState<Investment[]>([]);
  const [agentMessage, setAgentMessage] = useState(
    "Welcome! I've prepared some suggestions based on your profile. Tap an investment to add it."
  );

  const suggestions = useMemo(
    () => getSuggestions(profile, activePortfolio),
    [profile, activePortfolio]
  );

  const totalRisk = activePortfolio.length
    ? Math.round(activePortfolio.reduce((s, i) => s + i.riskLevel, 0) / activePortfolio.length * 10)
    : 0;

  const monthlyIncome = activePortfolio.reduce(
    (s, i) => s + Math.round((1000 * i.annualReturn) / 100 / 12),
    0
  );

  const addInvestment = (inv: Investment) => {
    if (activePortfolio.length >= 4) {
      setAgentMessage("Your portfolio is full! Remove one to add another.");
      return;
    }
    if (activePortfolio.find((i) => i.id === inv.id)) return;
    const next = [...activePortfolio, inv];
    setActivePortfolio(next);

    const newRisk = Math.round(next.reduce((s, i) => s + i.riskLevel, 0) / next.length * 10);
    if (newRisk > 70) {
      setAgentMessage("Your profile is balanced, but you're taking more risk than recommended. Consider safer options.");
    } else if (newRisk < 20) {
      setAgentMessage("Very safe choices! Growth will be slow but steady.");
    } else {
      setAgentMessage("Good pick! Your portfolio is looking balanced.");
    }
  };

  const removeInvestment = (id: string) => {
    setActivePortfolio((prev) => prev.filter((i) => i.id !== id));
    setAgentMessage("Investment removed. You can add a new one from the suggestions.");
  };

  const handleSimulate = () => {
    const slots: PortfolioSlot[] = activePortfolio.map((i) => i.type);
    onComplete(slots, activePortfolio);
  };

  const profileLabel = profile === "conservative" ? "Conservative" : profile === "growth" ? "Growth" : "Balanced";
  const profileEmoji = profile === "conservative" ? "🛡️" : profile === "growth" ? "🌳" : "🌿";

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      {/* Top Section: Profile + Agent */}
      <div className="flex gap-3 p-4 pb-2">
        {/* Profile Card */}
        <motion.div
          className="bg-card rounded-3xl p-4 shadow-sm flex-shrink-0 min-w-[140px]"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm text-muted-foreground">Profile: {profileLabel}</p>
          <p className="text-2xl font-serif text-foreground mt-1">Risk: {totalRisk}%</p>
          <div className="h-px bg-border my-2" />
          <p className="text-xs text-muted-foreground">Monthly Income:</p>
          <p className="text-lg font-serif text-primary">€{monthlyIncome}</p>
        </motion.div>

        {/* Agent Bubble */}
        <motion.div
          className="flex-1 flex flex-col items-end gap-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-card rounded-3xl rounded-tr-lg p-4 shadow-sm w-full relative">
            <AnimatePresence mode="wait">
              <motion.p
                key={agentMessage}
                className="text-sm text-foreground leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {agentMessage}
              </motion.p>
            </AnimatePresence>
          </div>
          <span className="text-2xl mr-2">🧑‍💼</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex gap-3">
          {/* Active Portfolio */}
          <motion.div
            className="flex-1"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              MY ACTIVE PORTFOLIO {profileEmoji}
            </h3>
            <div className="space-y-2">
              {activePortfolio.length === 0 && (
                <div className="bg-muted/50 rounded-2xl p-6 text-center border-2 border-dashed border-border">
                  <p className="text-muted-foreground text-sm">Add investments from suggestions →</p>
                </div>
              )}
              <AnimatePresence>
                {activePortfolio.map((inv) => (
                  <motion.div
                    key={inv.id}
                    className="bg-card rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => removeInvestment(inv.id)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileTap={{ scale: 0.95 }}
                    layout
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{inv.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {inv.name} {inv.flag || ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Risk: <span className={getRiskColor(inv.riskLevel)}>{inv.riskLevel}/10</span> | Ann. Return: {inv.annualReturn}%
                        </p>
                      </div>
                    </div>
                    {inv.tag && (
                      <span className="inline-block mt-1 text-[10px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                        {inv.tag}
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Agent Suggestions */}
          <motion.div
            className="flex-1"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              SUGGESTIONS 💡
            </h3>
            <div className="space-y-2">
              {suggestions.map((inv) => (
                <motion.div
                  key={inv.id}
                  className="bg-card rounded-2xl p-3 shadow-sm cursor-pointer border-2 border-dashed border-border hover:border-primary hover:shadow-md transition-all"
                  onClick={() => addInvestment(inv)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{inv.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.name} {inv.flag || ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Risk: <span className={getRiskColor(inv.riskLevel)}>{inv.riskLevel}/10</span> | Ann. Return: {inv.annualReturn}%
                      </p>
                    </div>
                  </div>
                  {inv.tag && (
                    <span className="inline-block mt-1 text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                      {inv.tag}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 space-y-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <motion.button
            className="flex-1 bg-card text-foreground py-3 rounded-2xl text-sm font-medium shadow-sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActivePortfolio([]);
              setAgentMessage("Portfolio cleared! Let's start fresh.");
            }}
          >
            ⚙️ Adjust
          </motion.button>
          <motion.button
            className="flex-1 bg-card text-foreground py-3 rounded-2xl text-sm font-medium shadow-sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => setAgentMessage("Holding is a great strategy! Patience pays off in investing.")}
          >
            🧘 Hold
          </motion.button>
          <motion.button
            className="flex-1 bg-card text-foreground py-3 rounded-2xl text-sm font-medium shadow-sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => setAgentMessage("Try mixing safe and growth investments for a balanced approach!")}
          >
            ❓ Ask More
          </motion.button>
        </div>

        {/* Simulate Button */}
        <motion.button
          className={`w-full py-4 rounded-3xl text-lg font-medium shadow-lg transition-all ${
            activePortfolio.length > 0
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          onClick={activePortfolio.length > 0 ? handleSimulate : undefined}
          whileHover={activePortfolio.length > 0 ? { scale: 1.02 } : {}}
          whileTap={activePortfolio.length > 0 ? { scale: 0.97 } : {}}
        >
          👉 SIMULATE MY GARDEN
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PortfolioBuilder;
