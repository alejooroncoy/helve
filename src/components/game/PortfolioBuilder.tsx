import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ArrowRightLeft, TrendingUp, Shield, Zap, Info } from "lucide-react";
import type { Investment, PortfolioSlot, RiskProfile } from "@/game/types";
import { availableInvestments } from "@/game/types";

interface Props {
  profile: RiskProfile;
  onComplete: (portfolio: PortfolioSlot[], investments: Investment[]) => void;
}

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

function getRecommended(profile: RiskProfile): Investment[] {
  const all = availableInvestments;
  if (profile === "conservative") {
    // 2 safe + 1 balanced
    return [
      all.find(i => i.id === "ch-bond-aaa")!,
      all.find(i => i.id === "global-bond")!,
      all.find(i => i.id === "gold-chf")!,
    ];
  }
  if (profile === "growth") {
    // 1 balanced + 2 growth
    return [
      all.find(i => i.id === "smi-index")!,
      all.find(i => i.id === "apple")!,
      all.find(i => i.id === "nvidia")!,
    ];
  }
  // balanced
  return [
    all.find(i => i.id === "ch-bond-aaa")!,
    all.find(i => i.id === "smi-index")!,
    all.find(i => i.id === "djia-index")!,
  ];
}

function getRiskColor(risk: number): string {
  if (risk <= 3) return "#22c55e";
  if (risk <= 6) return "#f59e0b";
  return "#ef4444";
}

function getRiskLabel(risk: number): string {
  if (risk <= 3) return "Bajo";
  if (risk <= 6) return "Medio";
  return "Alto";
}

function getTypeIcon(type: PortfolioSlot) {
  if (type === "safe") return <Shield size={14} />;
  if (type === "balanced") return <TrendingUp size={14} />;
  return <Zap size={14} />;
}

function getTypeLabel(type: PortfolioSlot): string {
  if (type === "safe") return "Seguro";
  if (type === "balanced") return "Equilibrado";
  return "Crecimiento";
}

const profileLabels: Record<RiskProfile, { name: string; emoji: string; desc: string }> = {
  conservative: { name: "Guardián Prudente", emoji: "🛡️", desc: "Tu portafolio prioriza la seguridad" },
  balanced: { name: "Explorador Equilibrado", emoji: "🌿", desc: "Balance entre seguridad y crecimiento" },
  growth: { name: "Águila Audaz", emoji: "🦅", desc: "Máximo crecimiento, mayor riesgo" },
};

const PortfolioBuilder = ({ profile, onComplete }: Props) => {
  const recommended = useMemo(() => getRecommended(profile), [profile]);
  const [portfolio, setPortfolio] = useState<Investment[]>(recommended);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const alternatives = useMemo(() => {
    const ids = new Set(portfolio.map(i => i.id));
    return availableInvestments.filter(i => !ids.has(i.id));
  }, [portfolio]);

  const avgRisk = portfolio.length
    ? Math.round(portfolio.reduce((s, i) => s + i.riskLevel, 0) / portfolio.length * 10) / 10
    : 0;

  const avgReturn = portfolio.length
    ? Math.round(portfolio.reduce((s, i) => s + i.annualReturn, 0) / portfolio.length * 10) / 10
    : 0;

  const handleSwap = (newInv: Investment) => {
    if (swapSlot === null) return;
    setPortfolio(prev => prev.map((inv, i) => i === swapSlot ? newInv : inv));
    setSwapSlot(null);
  };

  const handleSimulate = () => {
    const slots: PortfolioSlot[] = portfolio.map(i => i.type);
    onComplete(slots, portfolio);
  };

  const p = profileLabels[profile];

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{p.emoji}</span>
          <div>
            <h2 className="text-xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>{p.name}</h2>
            <p className="text-sm text-muted-foreground" style={nunito}>{p.desc}</p>
          </div>
        </div>

        {/* Risk/Return summary */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl p-3 border-2" style={{ borderColor: getRiskColor(avgRisk) }}>
            <p className="text-xs text-muted-foreground" style={nunito}>Riesgo promedio</p>
            <p className="text-2xl" style={{ ...nunito, fontWeight: 800, color: getRiskColor(avgRisk) }}>
              {avgRisk}<span className="text-sm">/10</span>
            </p>
            <p className="text-xs" style={{ ...nunito, color: getRiskColor(avgRisk) }}>{getRiskLabel(avgRisk)}</p>
          </div>
          <div className="flex-1 rounded-2xl p-3 border-2" style={{ borderColor: CELESTE }}>
            <p className="text-xs text-muted-foreground" style={nunito}>Retorno anual est.</p>
            <p className="text-2xl" style={{ ...nunito, fontWeight: 800, color: CELESTE }}>
              {avgReturn}<span className="text-sm">%</span>
            </p>
            <p className="text-xs text-muted-foreground" style={nunito}>promedio</p>
          </div>
        </div>
      </div>

      {/* Portfolio label */}
      <div className="px-5 pt-2 pb-2">
        <p className="text-sm tracking-widest text-muted-foreground" style={{ ...nunito, fontWeight: 700 }}>
          TU PORTAFOLIO RECOMENDADO
        </p>
      </div>

      {/* Portfolio cards */}
      <div className="px-5 space-y-3 flex-1">
        <AnimatePresence mode="popLayout">
          {portfolio.map((inv, idx) => (
            <motion.div
              key={inv.id}
              className="rounded-2xl border-2 p-4 relative overflow-hidden"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ delay: idx * 0.08 }}
              layout
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{inv.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground truncate" style={{ ...nunito, fontWeight: 700 }}>
                      {inv.name}
                    </p>
                    {inv.flag && <span className="text-sm">{inv.flag}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: getRiskColor(inv.riskLevel) + "20", color: getRiskColor(inv.riskLevel) }}>
                      {getTypeIcon(inv.type)} {getTypeLabel(inv.type)}
                    </span>
                    {inv.tag && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{inv.tag}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Riesgo </span>
                      <span className="text-sm" style={{ ...nunito, fontWeight: 700, color: getRiskColor(inv.riskLevel) }}>
                        {inv.riskLevel}/10
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Retorno </span>
                      <span className="text-sm" style={{ ...nunito, fontWeight: 700, color: CELESTE }}>
                        {inv.annualReturn}%
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSwapSlot(swapSlot === idx ? null : idx)}
                  className="p-2 rounded-xl transition-colors"
                  style={{
                    backgroundColor: swapSlot === idx ? CELESTE + "20" : "transparent",
                    color: swapSlot === idx ? CELESTE : "hsl(var(--muted-foreground))",
                  }}
                >
                  <ArrowRightLeft size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Swap drawer */}
      <AnimatePresence>
        {swapSlot !== null && (
          <motion.div
            className="px-5 pb-2 pt-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="text-sm tracking-widest text-muted-foreground mb-2" style={{ ...nunito, fontWeight: 700 }}>
              CAMBIAR POR...
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {alternatives.map((inv) => (
                <motion.button
                  key={inv.id}
                  onClick={() => handleSwap(inv)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 border-dashed text-left transition-colors"
                  style={{ borderColor: "hsl(var(--border))" }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-xl">{inv.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate" style={{ ...nunito, fontWeight: 600 }}>
                      {inv.name} {inv.flag || ""}
                    </p>
                    <div className="flex gap-3 text-xs">
                      <span style={{ color: getRiskColor(inv.riskLevel) }}>Riesgo {inv.riskLevel}/10</span>
                      <span style={{ color: CELESTE }}>Retorno {inv.annualReturn}%</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: getRiskColor(inv.riskLevel) + "20", color: getRiskColor(inv.riskLevel) }}>
                    {getTypeLabel(inv.type)}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom CTA */}
      <div className="px-5 py-6">
        <motion.button
          onClick={handleSimulate}
          className="w-full py-4 rounded-2xl tracking-widest text-sm text-white"
          style={{ ...nunito, backgroundColor: CELESTE, fontWeight: 900 }}
          whileTap={{ scale: 0.97 }}
        >
          SIMULAR MI PORTAFOLIO
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PortfolioBuilder;
