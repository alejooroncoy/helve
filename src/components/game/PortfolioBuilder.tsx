import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, TrendingUp, Shield, Zap } from "lucide-react";
import type { Investment, PortfolioSlot, RiskProfile } from "@/game/types";
import { availableInvestments, ASSET_CLASSES } from "@/game/types";
import { useInstrumentStats } from "@/hooks/useMarketData";
import { useTranslation } from "react-i18next";

interface Props {
  profile: RiskProfile;
  onComplete: (portfolio: PortfolioSlot[], investments: Investment[]) => void;
}

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

// Map category keys to their representative DB IDs for stats enrichment
const categoryToDbIds: Record<string, string[]> = {};
for (const c of ASSET_CLASSES) {
  if (c.dbIds.length > 0) categoryToDbIds[c.key] = c.dbIds;
}
const allDbIds = ASSET_CLASSES.flatMap(c => c.dbIds);

function getRecommended(profile: RiskProfile): Investment[] {
  const all = availableInvestments;
  if (profile === "conservative") {
    return [all.find(i => i.id === "bonds")!, all.find(i => i.id === "gold")!, all.find(i => i.id === "fx")!];
  }
  if (profile === "growth") {
    return [all.find(i => i.id === "usStocks")!, all.find(i => i.id === "crypto")!, all.find(i => i.id === "equity")!];
  }
  return [all.find(i => i.id === "bonds")!, all.find(i => i.id === "equity")!, all.find(i => i.id === "swissStocks")!];
}



function getRiskColor(risk: number): string {
  if (risk <= 3) return "#22c55e";
  if (risk <= 6) return "#f59e0b";
  return "#ef4444";
}

function getTypeIcon(type: PortfolioSlot) {
  if (type === "safe") return <Shield size={14} />;
  if (type === "balanced") return <TrendingUp size={14} />;
  return <Zap size={14} />;
}

const PortfolioBuilder = ({ profile, onComplete }: Props) => {
  const { t } = useTranslation();
  const recommended = useMemo(() => getRecommended(profile), [profile]);
  const [portfolio, setPortfolio] = useState<Investment[]>(recommended);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);

  const { stats, loading } = useInstrumentStats(allDbIds);

  const getRiskLabel = (risk: number): string => {
    if (risk <= 3) return t("portfolio.low");
    if (risk <= 6) return t("portfolio.medium");
    return t("portfolio.high");
  };

  const getTypeLabel = (type: PortfolioSlot): string => {
    if (type === "safe") return t("portfolio.safe");
    if (type === "balanced") return t("portfolio.balanced");
    return t("portfolio.growth");
  };

  const enriched = useMemo(() => {
    return portfolio.map(inv => {
      const dbIds = categoryToDbIds[inv.id];
      const dbId = dbIds?.[0];
      const real = dbId ? stats[dbId] : null;
      if (real) return { ...inv, annualReturn: real.avgAnnualReturn, riskLevel: real.riskLevel };
      return inv;
    });
  }, [portfolio, stats]);

  const alternatives = useMemo(() => {
    const ids = new Set(portfolio.map(i => i.id));
    return availableInvestments
      .filter(i => !ids.has(i.id))
      .map(inv => {
        const dbIds = categoryToDbIds[inv.id];
        const dbId = dbIds?.[0];
        const real = dbId ? stats[dbId] : null;
        if (real) return { ...inv, annualReturn: real.avgAnnualReturn, riskLevel: real.riskLevel };
        return inv;
      });
  }, [portfolio, stats]);

  const avgRisk = enriched.length ? Math.round(enriched.reduce((s, i) => s + i.riskLevel, 0) / enriched.length * 10) / 10 : 0;
  const avgReturn = enriched.length ? Math.round(enriched.reduce((s, i) => s + i.annualReturn, 0) / enriched.length * 10) / 10 : 0;

  const handleSwap = (newInv: Investment) => {
    if (swapSlot === null) return;
    setPortfolio(prev => prev.map((inv, i) => i === swapSlot ? newInv : inv));
    setSwapSlot(null);
  };

  const handleSimulate = () => {
    const slots: PortfolioSlot[] = enriched.map(i => i.type);
    onComplete(slots, enriched);
  };

  const pLabel = t(`portfolio.profileLabels.${profile}`, { returnObjects: true }) as { name: string; emoji: string; desc: string };

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div>
          <div>
            <h2 className="text-xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>{pLabel.name}</h2>
            <p className="text-sm text-muted-foreground" style={nunito}>{pLabel.desc}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl p-3 border-2" style={{ borderColor: getRiskColor(avgRisk) }}>
            <p className="text-xs text-muted-foreground" style={nunito}>{t("portfolio.realRisk")}</p>
            <p className="text-2xl" style={{ ...nunito, fontWeight: 800, color: getRiskColor(avgRisk) }}>
              {loading ? "..." : avgRisk}<span className="text-sm">/10</span>
            </p>
            <p className="text-xs" style={{ ...nunito, color: getRiskColor(avgRisk) }}>{getRiskLabel(avgRisk)}</p>
          </div>
          <div className="flex-1 rounded-2xl p-3 border-2" style={{ borderColor: CELESTE }}>
            <p className="text-xs text-muted-foreground" style={nunito}>{t("portfolio.realReturn")}</p>
            <p className="text-2xl" style={{ ...nunito, fontWeight: 800, color: CELESTE }}>
              {loading ? "..." : avgReturn}<span className="text-sm">%</span>
            </p>
            <p className="text-xs text-muted-foreground" style={nunito}>{t("portfolio.cagr")}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-2 pb-2">
        <p className="text-sm tracking-widest text-muted-foreground" style={{ ...nunito, fontWeight: 700 }}>
          {t("portfolio.yourRecommended")}
        </p>
      </div>

      <div className="px-5 space-y-3 flex-1">
        <AnimatePresence mode="popLayout">
          {enriched.map((inv, idx) => {
            const dbIds = categoryToDbIds[inv.id];
            const dbId = dbIds?.[0];
            const real = dbId ? stats[dbId] : null;
            return (
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
                      <p className="text-foreground truncate" style={{ ...nunito, fontWeight: 700 }}>{inv.name}</p>
                      {inv.flag && <span className="text-sm">{inv.flag}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: getRiskColor(inv.riskLevel) + "20", color: getRiskColor(inv.riskLevel) }}>
                        {getTypeIcon(inv.type)} {getTypeLabel(inv.type)}
                      </span>
                      {inv.tag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {inv.tag}
                          {(inv.tag === "AAA" || inv.tag === "GOV") && (
                            <span className="ml-1 text-[10px] opacity-70">
                              {inv.tag === "AAA" ? t("tags.maxQuality") : t("tags.government")}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <span className="text-xs text-muted-foreground">{t("portfolio.risk")} </span>
                        <span className="text-sm" style={{ ...nunito, fontWeight: 700, color: getRiskColor(inv.riskLevel) }}>
                          {inv.riskLevel}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">{t("portfolio.return")} </span>
                        <span className="text-sm" style={{ ...nunito, fontWeight: 700, color: CELESTE }}>
                          {inv.annualReturn}%
                        </span>
                      </div>
                      {real && (
                        <div>
                          <span className="text-xs text-muted-foreground">{t("portfolio.vol")} </span>
                          <span className="text-sm" style={{ ...nunito, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>
                            {real.volatility}%
                          </span>
                        </div>
                      )}
                    </div>
                    {real && (
                      <p className="text-[10px] text-muted-foreground mt-1" style={nunito}>
                        {t("portfolio.total")}: {real.totalReturn > 0 ? "+" : ""}{real.totalReturn}%
                      </p>
                    )}
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
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {swapSlot !== null && (
          <motion.div
            className="px-5 pb-2 pt-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="text-sm tracking-widest text-muted-foreground mb-2" style={{ ...nunito, fontWeight: 700 }}>
              {t("portfolio.swapFor")}
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
                      <span style={{ color: getRiskColor(inv.riskLevel) }}>{t("portfolio.risk")} {inv.riskLevel}/10</span>
                      <span style={{ color: CELESTE }}>{t("portfolio.return")} {inv.annualReturn}%</span>
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

      <div className="px-5 py-6">
        <motion.button
          onClick={handleSimulate}
          className="w-full py-4 rounded-2xl tracking-widest text-sm text-white"
          style={{ ...nunito, backgroundColor: CELESTE, fontWeight: 900 }}
          whileTap={{ scale: 0.97 }}
          disabled={loading}
        >
          {loading ? t("portfolio.loadingRealData") : t("portfolio.simulate")}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PortfolioBuilder;
