import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { Investment, PortfolioSlot } from "@/game/types";
import { availableInvestments } from "@/game/types";

interface Props {
  profile: string;
  onComplete: (portfolio: PortfolioSlot[], investments: Investment[]) => void;
}

const CELESTE = "#5BB8F5";
const CELESTE_BG = "#EBF6FF";
const MAX_SLOTS = 4;

function getSuggestions(profile: string, active: Investment[]): Investment[] {
  const activeIds = new Set(active.map((i) => i.id));
  const pool = availableInvestments.filter((i) => !activeIds.has(i.id));
  if (profile === "conservative") return pool.sort((a, b) => a.riskLevel - b.riskLevel).slice(0, 4);
  if (profile === "growth") return pool.sort((a, b) => b.annualReturn - a.annualReturn).slice(0, 4);
  return pool.sort((a, b) => Math.abs(5 - a.riskLevel) - Math.abs(5 - b.riskLevel)).slice(0, 4);
}

function getRiskLabel(risk: number): { text: string; color: string } {
  if (risk <= 3) return { text: "Low", color: "#4CAF50" };
  if (risk <= 6) return { text: "Med", color: CELESTE };
  return { text: "High", color: "#FF6B6B" };
}

function getAgentMessage(portfolio: Investment[], profile: string): string {
  if (portfolio.length === 0) {
    return profile === "conservative"
      ? "I picked some safe options for you! Tap one to add it to your garden 🌱"
      : profile === "growth"
      ? "Here are some high-growth picks! Tap to add them 🌳"
      : "I have some balanced suggestions! Tap to start building 🌿";
  }
  if (portfolio.length >= MAX_SLOTS) {
    return "Your garden is full! Tap a plant to remove it, or simulate your growth 🎉";
  }
  const avgRisk = portfolio.reduce((s, i) => s + i.riskLevel, 0) / portfolio.length;
  if (avgRisk > 7) return "That's quite adventurous! Consider adding something safer 🛡️";
  if (avgRisk < 3) return "Very safe choices! Your garden will grow slowly but surely 🐢";
  return "Nice balance! Your garden is looking healthy 💚";
}

const PortfolioBuilder = ({ profile, onComplete }: Props) => {
  const [activePortfolio, setActivePortfolio] = useState<Investment[]>([]);
  const [tab, setTab] = useState<"suggestions" | "portfolio">("suggestions");

  const suggestions = useMemo(() => getSuggestions(profile, activePortfolio), [profile, activePortfolio]);
  const agentMessage = useMemo(() => getAgentMessage(activePortfolio, profile), [activePortfolio, profile]);

  const totalRisk = activePortfolio.length
    ? Math.round((activePortfolio.reduce((s, i) => s + i.riskLevel, 0) / activePortfolio.length) * 10)
    : 0;

  const monthlyIncome = activePortfolio.reduce(
    (s, i) => s + Math.round((1000 * i.annualReturn) / 100 / 12),
    0
  );

  const addInvestment = (inv: Investment) => {
    if (activePortfolio.length >= MAX_SLOTS) return;
    if (activePortfolio.find((i) => i.id === inv.id)) return;
    setActivePortfolio((prev) => [...prev, inv]);
    if (activePortfolio.length + 1 >= MAX_SLOTS) setTab("portfolio");
  };

  const removeInvestment = (id: string) => {
    setActivePortfolio((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSimulate = () => {
    const slots: PortfolioSlot[] = activePortfolio.map((i) => i.type);
    onComplete(slots, activePortfolio);
  };

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-4">
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <div className="flex-1 h-5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: CELESTE }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((activePortfolio.length / MAX_SLOTS) * 100, 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-xs font-serif text-muted-foreground" style={{ fontWeight: 600 }}>
          {activePortfolio.length}/{MAX_SLOTS}
        </span>
      </div>

      {/* Mascot + speech bubble */}
      <div className="flex items-center gap-2 px-4 pt-0 pb-4">
        <img
          src="/perspectiva2.png"
          alt="Helve mascot"
          className="object-contain flex-shrink-0"
          style={{ width: 200, height: 200, marginRight: -40, marginLeft: -42 }}
        />
        <div
          className="relative rounded-2xl px-5 py-4 flex-1"
          style={{ backgroundColor: "white", border: "2px solid hsl(var(--border))" }}
        >
          <div
            className="absolute top-6 w-0 h-0"
            style={{
              left: -14,
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              borderRight: "13px solid hsl(var(--border))",
            }}
          />
          <div
            className="absolute top-6 w-0 h-0"
            style={{
              left: -11,
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderRight: "12px solid white",
            }}
          />
          <AnimatePresence mode="wait">
            <motion.p
              key={agentMessage}
              className="font-serif text-foreground text-sm leading-snug"
              style={{ fontWeight: 600 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {agentMessage}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Stats bar */}
      {activePortfolio.length > 0 && (
        <motion.div
          className="flex gap-3 px-5 pb-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex-1 rounded-2xl px-4 py-3" style={{ backgroundColor: CELESTE_BG }}>
            <p className="text-xs text-muted-foreground">Risk Level</p>
            <p className="font-serif text-lg" style={{ fontWeight: 900, color: CELESTE }}>{totalRisk}%</p>
          </div>
          <div className="flex-1 rounded-2xl px-4 py-3" style={{ backgroundColor: CELESTE_BG }}>
            <p className="text-xs text-muted-foreground">Est. Monthly</p>
            <p className="font-serif text-lg" style={{ fontWeight: 900, color: "#4CAF50" }}>€{monthlyIncome}</p>
          </div>
        </motion.div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-2 px-5 pb-3">
        <button
          onClick={() => setTab("suggestions")}
          className="flex-1 py-2.5 rounded-xl font-serif text-sm transition-all"
          style={{
            fontWeight: 700,
            backgroundColor: tab === "suggestions" ? CELESTE : "hsl(var(--secondary))",
            color: tab === "suggestions" ? "white" : "hsl(var(--muted-foreground))",
          }}
        >
          💡 Suggestions
        </button>
        <button
          onClick={() => setTab("portfolio")}
          className="flex-1 py-2.5 rounded-xl font-serif text-sm transition-all"
          style={{
            fontWeight: 700,
            backgroundColor: tab === "portfolio" ? CELESTE : "hsl(var(--secondary))",
            color: tab === "portfolio" ? "white" : "hsl(var(--muted-foreground))",
          }}
        >
          🌱 My Garden ({activePortfolio.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <AnimatePresence mode="wait">
          {tab === "suggestions" ? (
            <motion.div
              key="suggestions"
              className="flex flex-col gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {suggestions.map((inv, i) => {
                const risk = getRiskLabel(inv.riskLevel);
                const alreadyAdded = activePortfolio.some((a) => a.id === inv.id);
                return (
                  <motion.button
                    key={inv.id}
                    onClick={() => addInvestment(inv)}
                    disabled={alreadyAdded || activePortfolio.length >= MAX_SLOTS}
                    className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl border-2 text-left transition-all"
                    style={{
                      borderColor: alreadyAdded ? CELESTE : "hsl(var(--border))",
                      backgroundColor: alreadyAdded ? CELESTE_BG : "hsl(var(--card))",
                      opacity: alreadyAdded ? 0.6 : 1,
                    }}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: alreadyAdded ? 0.6 : 1 }}
                    transition={{ delay: 0.05 + i * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="text-3xl">{inv.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-foreground text-sm truncate" style={{ fontWeight: 700 }}>
                        {inv.name} {inv.flag || ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-serif" style={{ color: risk.color, fontWeight: 700 }}>
                          Risk: {inv.riskLevel}/10
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-serif text-muted-foreground" style={{ fontWeight: 600 }}>
                          Return: {inv.annualReturn}%
                        </span>
                      </div>
                    </div>
                    {inv.tag && (
                      <span
                        className="text-[10px] font-serif px-2 py-1 rounded-full flex-shrink-0"
                        style={{
                          fontWeight: 700,
                          backgroundColor: inv.tag === "HIGH RISK" ? "#FFE0E0" : CELESTE_BG,
                          color: inv.tag === "HIGH RISK" ? "#FF6B6B" : CELESTE,
                        }}
                      >
                        {inv.tag}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="portfolio"
              className="flex flex-col gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activePortfolio.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="text-4xl">🌱</span>
                  <p className="font-serif text-muted-foreground text-sm text-center" style={{ fontWeight: 600 }}>
                    Your garden is empty!<br />Add investments from Suggestions
                  </p>
                </div>
              ) : (
                activePortfolio.map((inv, i) => {
                  const risk = getRiskLabel(inv.riskLevel);
                  return (
                    <motion.div
                      key={inv.id}
                      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl border-2 text-left"
                      style={{ borderColor: CELESTE, backgroundColor: CELESTE_BG }}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      layout
                    >
                      <span className="text-3xl">{inv.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-foreground text-sm truncate" style={{ fontWeight: 700 }}>
                          {inv.name} {inv.flag || ""}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-serif" style={{ color: risk.color, fontWeight: 700 }}>
                            Risk: {inv.riskLevel}/10
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-serif text-muted-foreground" style={{ fontWeight: 600 }}>
                            Return: {inv.annualReturn}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeInvestment(inv.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-colors"
                        style={{ backgroundColor: "white", color: "#FF6B6B" }}
                      >
                        ✕
                      </button>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 py-6">
        <button
          onClick={activePortfolio.length > 0 ? handleSimulate : undefined}
          disabled={activePortfolio.length === 0}
          className="w-full py-4 rounded-2xl font-serif tracking-widest text-sm text-white transition-opacity"
          style={{
            backgroundColor: CELESTE,
            fontWeight: 900,
            opacity: activePortfolio.length === 0 ? 0.4 : 1,
          }}
        >
          🌳 SIMULATE MY GARDEN
        </button>
      </div>
    </motion.div>
  );
};

export default PortfolioBuilder;
