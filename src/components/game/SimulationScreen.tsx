import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { AssetAllocation, AssetClass, RiskProfile } from "@/game/types";
import { ASSET_CLASSES, getAllocationRiskScore, getProfileRiskRange, ALL_ASSET_DB_IDS } from "@/game/types";
import { useMonthlyPrices } from "@/hooks/useMarketData";

interface Props {
  allocation: AssetAllocation;
  profile: RiskProfile;
  stormChoice: "stay" | "sell" | null;
  onContinue: (result: number) => void;
}

const nunito = { fontFamily: "'Nunito', sans-serif" };

type Period = { months: number; key: string };
const periods: Period[] = [
  { months: 3, key: "3m" },
  { months: 6, key: "6m" },
  { months: 12, key: "1y" },
  { months: 60, key: "5y" },
];

const CLASS_COLORS: Record<AssetClass, string> = {
  bonds: "hsl(210, 60%, 55%)",
  equity: "hsl(145, 58%, 36%)",
  gold: "hsl(38, 92%, 50%)",
  fx: "hsl(200, 70%, 50%)",
  swissStocks: "hsl(0, 72%, 51%)",
  usStocks: "hsl(220, 70%, 50%)",
  crypto: "hsl(270, 60%, 55%)",
  cleanEnergy: "hsl(150, 60%, 45%)",
};

function simulateFromAllocations(
  prices: Record<string, { date: string; price: number }[]>,
  allocation: AssetAllocation,
  months: number
): { values: number[]; labels: string[]; dates: string[] } {
  const classSeries: Partial<Record<AssetClass, number[]>> = {};
  let refDates: string[] = [];

  for (const c of ASSET_CLASSES) {
    if (c.dbIds.length > 0) {
      const available = c.dbIds.filter(id => prices[id] && prices[id].length > months);
      if (available.length > 0) {
        const series = available.map(id => {
          const data = prices[id]!;
          const slice = data.slice(-months - 1);
          const base = slice[0].price;
          return slice.map(p => base > 0 ? p.price / base : 1);
        });
        const len = Math.min(...series.map(s => s.length));
        const avg: number[] = [];
        for (let i = 0; i < len; i++) {
          avg.push(series.reduce((s, ser) => s + (ser[i] ?? 1), 0) / series.length);
        }
        classSeries[c.key] = avg;
        if (refDates.length === 0) {
          refDates = prices[available[0]]!.slice(-months - 1).map(p => p.date);
        }
      }
    }
    if (!classSeries[c.key] && c.syntheticMonthly) {
      const synth = c.syntheticMonthly;
      const series: number[] = [1];
      for (let i = 1; i <= months; i++) {
        const r = synth.mean + (Math.random() - 0.5) * synth.vol;
        series.push(series[i - 1] * (1 + r));
      }
      classSeries[c.key] = series;
    }
  }

  const lengths = Object.values(classSeries).map(s => s!.length);
  const seriesLen = lengths.length > 0 ? Math.min(...lengths, months + 1) : 1;
  if (seriesLen <= 1) return { values: [100], labels: ["Start"], dates: [] };

  const values: number[] = [];
  const labels: string[] = [];
  const dates: string[] = [];

  for (let i = 0; i < seriesLen; i++) {
    let weighted = 0;
    let totalWeight = 0;
    for (const c of ASSET_CLASSES) {
      const pct = allocation[c.key];
      if (pct > 0 && classSeries[c.key]) {
        weighted += (pct / 100) * (classSeries[c.key]![i] ?? 1);
        totalWeight += pct / 100;
      }
    }
    values.push(Math.round((totalWeight > 0 ? (weighted / totalWeight) * 100 : 100) * 10) / 10);
    dates.push(refDates[i] || "");
    if (i === 0) labels.push("Start");
    else if (months <= 6) labels.push(`M${i}`);
    else if (months <= 12) labels.push(i % 2 === 0 ? `M${i}` : "");
    else labels.push(i % 12 === 0 ? `Y${Math.floor(i / 12)}` : "");
  }

  return { values, labels, dates };
}

const SimulationScreen = ({ allocation, profile, stormChoice, onContinue }: Props) => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[2]);
  const [simulated, setSimulated] = useState(false);

  const { prices, loading } = useMonthlyPrices(ALL_ASSET_DB_IDS);

  const sim = useMemo(() => {
    if (loading || Object.keys(prices).length === 0) return { values: [100], labels: ["Start"], dates: [] };
    return simulateFromAllocations(prices, allocation, selectedPeriod.months);
  }, [prices, loading, allocation, selectedPeriod.months]);

  const finalValue = sim.values[sim.values.length - 1];
  const change = Math.round((finalValue - 100) * 10) / 10;
  const isPositive = change >= 0;
  const maxVal = Math.max(...sim.values);
  const minVal = Math.min(...sim.values);
  const range = maxVal - minVal || 1;

  let worstDip = 0;
  let peak = sim.values[0];
  for (const v of sim.values) {
    if (v > peak) peak = v;
    const dip = ((v - peak) / peak) * 100;
    if (dip < worstDip) worstDip = dip;
  }

  const chartHeight = 180;
  const chartWidth = 320;
  const points = sim.values.map((v, i) => {
    const x = (i / Math.max(sim.values.length - 1, 1)) * chartWidth;
    const y = chartHeight - ((v - minVal) / range) * (chartHeight - 20);
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;
  const dateRange = sim.dates.length > 1 ? `${sim.dates[0]} → ${sim.dates[sim.dates.length - 1]}` : "";

  const riskScore = getAllocationRiskScore(allocation);
  const [minR, maxR] = getProfileRiskRange(profile);
  const isAligned = riskScore >= minR && riskScore <= maxR;
  const summaryKey = isAligned ? "aligned" : riskScore > maxR ? "tooAggressive" : "tooConservative";

  return (
    <motion.div className="flex flex-col min-h-screen bg-background" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-2xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>
          {simulated ? t("simulation.results") : t("simulation.howLong")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1" style={nunito}>
          {simulated ? t("simulation.historicalData", { period: t(`simulation.periods.${selectedPeriod.key}`) }) : t("simulation.basedOnReal")}
        </p>
      </div>

      <div className="px-5 pb-4">
        <div className="flex gap-2">
          {periods.map((p) => (
            <motion.button key={p.key} onClick={() => { setSelectedPeriod(p); setSimulated(false); }}
              className="flex-1 py-3 rounded-2xl text-sm transition-colors border-2"
              style={{ ...nunito, fontWeight: 700,
                borderColor: selectedPeriod.key === p.key ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: selectedPeriod.key === p.key ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
                color: selectedPeriod.key === p.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {t(`simulation.periods.${p.key}`)}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-5 flex-1">
        <AnimatePresence mode="wait">
          {simulated ? (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 rounded-2xl p-4 border-2" style={{ borderColor: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                  <p className="text-xs text-muted-foreground" style={nunito}>{t("simulation.finalValue")}</p>
                  <p className="text-3xl" style={{ ...nunito, fontWeight: 800, color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>${finalValue}</p>
                  <p className="text-sm" style={{ ...nunito, color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>{isPositive ? "+" : ""}{change}%</p>
                </div>
                <div className="flex-1 rounded-2xl p-4 border-2" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs text-muted-foreground" style={nunito}>{t("simulation.invested")}</p>
                  <p className="text-2xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>$100</p>
                  <p className="text-xs text-muted-foreground" style={nunito}>{t("simulation.worstDip")}: {Math.round(worstDip)}%</p>
                </div>
              </div>

              {dateRange && <p className="text-[10px] text-muted-foreground text-center mb-2" style={nunito}>{t("simulation.dateRange", { range: dateRange })}</p>}

              <div className="rounded-2xl bg-card border-2 p-4 overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                <svg viewBox={`-10 -10 ${chartWidth + 20} ${chartHeight + 30}`} className="w-full" style={{ height: chartHeight + 40 }}>
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = chartHeight - pct * (chartHeight - 20);
                    const val = Math.round(minVal + pct * range);
                    return (<g key={pct}><line x1={0} y1={y} x2={chartWidth} y2={y} stroke="hsl(var(--border))" strokeWidth={0.5} /><text x={-8} y={y + 3} fontSize={8} fill="hsl(var(--muted-foreground))" textAnchor="end">{val}</text></g>);
                  })}
                  <line x1={0} y1={chartHeight - ((100 - minVal) / range) * (chartHeight - 20)} x2={chartWidth} y2={chartHeight - ((100 - minVal) / range) * (chartHeight - 20)} stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} strokeDasharray="4,4" />
                  <motion.polygon points={areaPoints} fill={isPositive ? "hsl(var(--primary) / 0.1)" : "hsl(var(--destructive) / 0.1)"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} />
                  <motion.polyline points={points} fill="none" stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                  <motion.circle cx={chartWidth} cy={chartHeight - ((finalValue - minVal) / range) * (chartHeight - 20)} r={4} fill={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }} />
                </svg>
              </div>

              {/* Asset class breakdown */}
              <div className="mt-4 space-y-1.5">
                <p className="text-xs tracking-widest text-muted-foreground" style={{ ...nunito, fontWeight: 700 }}>{t("simulation.yourPortfolio")}</p>
                {ASSET_CLASSES.filter(c => allocation[c.key] > 0).map((c) => (
                  <div key={c.key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CLASS_COLORS[c.key] }} />
                    <span className="text-xs text-foreground flex-1" style={{ ...nunito, fontWeight: 600 }}>{t(`allocation.classes.${c.key}`)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${allocation[c.key]}%`, backgroundColor: CLASS_COLORS[c.key] }} />
                    </div>
                    <span className="text-[10px] font-bold min-w-[3ch] text-right" style={{ ...nunito, color: CLASS_COLORS[c.key] }}>{allocation[c.key]}%</span>
                  </div>
                ))}
              </div>

              {/* Post-sim feedback */}
              <motion.div className="mt-4 rounded-2xl p-3" style={{
                backgroundColor: isAligned ? "hsl(var(--primary) / 0.08)" : "hsl(38, 92%, 50%, 0.08)",
                border: `2px solid ${isAligned ? "hsl(var(--primary) / 0.3)" : "hsl(38, 92%, 50%, 0.3)"}`,
              }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>
                <p className="text-xs font-bold text-foreground" style={nunito}>{t(`allocation.summary.${summaryKey}.title`)}</p>
                <p className="text-[10px] text-muted-foreground mt-1" style={nunito}>{t(`allocation.summary.${summaryKey}.desc`)}</p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="preview" className="flex flex-col items-center justify-center py-12 gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.img src="/perspectiva2.png" alt="Helve" className="object-contain" style={{ width: 200, height: 200 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} />
              <div className="text-center px-8">
                <p className="text-lg text-foreground" style={{ ...nunito, fontWeight: 700 }}>
                  {t("simulation.letsSeePart1")}<span style={{ color: "hsl(var(--primary))" }}>{t(`simulation.periods.${selectedPeriod.key}`)}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2" style={nunito}>{loading ? t("simulation.loadingMarketData") : t("simulation.realMarketData")}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center px-4">
                {ASSET_CLASSES.filter(c => allocation[c.key] > 0).map((c) => (
                  <span key={c.key} className="text-xs px-3 py-1.5 rounded-full bg-card border" style={nunito}>{t(`allocation.classes.${c.key}`)} {allocation[c.key]}%</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-6">
        {!simulated ? (
          <motion.button onClick={() => setSimulated(true)} className="w-full py-4 rounded-2xl tracking-widest text-sm"
            style={{ ...nunito, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: 900 }}
            whileTap={{ scale: 0.97 }} disabled={loading}>
            {loading ? t("simulation.loadingData") : `🚀 ${t("simulation.simulateBtn", { period: t(`simulation.periods.${selectedPeriod.key}`).toUpperCase() })}`}
          </motion.button>
        ) : (
          <div className="space-y-3">
            <motion.button onClick={() => setSimulated(false)} className="w-full py-3 rounded-2xl tracking-widest text-sm border-2"
              style={{ ...nunito, borderColor: "hsl(var(--primary))", color: "hsl(var(--primary))", fontWeight: 700 }}
              whileTap={{ scale: 0.97 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {t("simulation.tryAnother")}
            </motion.button>
            <motion.button onClick={() => onContinue(Math.round(finalValue))} className="w-full py-4 rounded-2xl tracking-widest text-sm"
              style={{ ...nunito, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: 900 }}
              whileTap={{ scale: 0.97 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              {t("simulation.continueBtn")}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SimulationScreen;
