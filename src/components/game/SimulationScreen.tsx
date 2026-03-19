import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PortfolioSlot, Investment } from "@/game/types";
import { useMonthlyPrices } from "@/hooks/useMarketData";

interface Props {
  portfolio: PortfolioSlot[];
  investments: Investment[];
  stormChoice: "stay" | "sell" | null;
  onContinue: (result: number) => void;
}

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

type Period = { label: string; months: number; key: string };

const periods: Period[] = [
  { label: "3 meses", months: 3, key: "3m" },
  { label: "6 meses", months: 6, key: "6m" },
  { label: "1 año", months: 12, key: "1y" },
  { label: "5 años", months: 60, key: "5y" },
];

// Map game investment IDs to DB instrument IDs
const investmentToDbId: Record<string, string> = {
  "ch-bond-aaa": "ch-bond-aaa",
  "global-bond": "global-bond-agg",
  "ch-govt-10y": "ch-govt-10y",
  "smi-index": "smi-index",
  "eurostoxx50": "eurostoxx50",
  "gold-chf": "gold-chf",
  "nestle": "nesn-ch",
  "novartis": "novn-ch",
  "djia-index": "djia-index",
  "dax-index": "dax-index",
  "apple": "aapl-us",
  "microsoft": "msft-us",
  "nvidia": "nvda-us",
  "logitech": "logn-ch",
  "ubs": "ubsg-ch",
  "amazon": "amzn-us",
  "green-energy": "smi-index", // fallback
};

/**
 * Simulate portfolio using real historical monthly prices from DB.
 * Takes the LAST N months of real data and computes equal-weighted portfolio performance.
 */
function simulateFromRealData(
  prices: Record<string, { date: string; price: number }[]>,
  investmentIds: string[],
  months: number
): { values: number[]; labels: string[]; dates: string[] } {
  const dbIds = investmentIds.map(id => investmentToDbId[id] || id);

  // Find instruments with available price data
  const available = dbIds.filter(id => prices[id] && prices[id].length > months);

  if (available.length === 0) {
    // Fallback: no data
    return { values: [100], labels: ["Inicio"], dates: [] };
  }

  // Use the last N months of data for each instrument
  const series: number[][] = available.map(id => {
    const data = prices[id]!;
    const slice = data.slice(-months - 1); // need months+1 points for months returns
    const basePrice = slice[0].price;
    return slice.map(p => (basePrice > 0 ? (p.price / basePrice) * 100 : 100));
  });

  // Equal-weighted portfolio: average of all normalized series
  const len = Math.min(...series.map(s => s.length));
  const values: number[] = [];
  const labels: string[] = [];
  const dates: string[] = [];

  const refData = prices[available[0]]!;
  const refSlice = refData.slice(-months - 1);

  for (let i = 0; i < len; i++) {
    const avg = series.reduce((sum, s) => sum + (s[i] ?? 100), 0) / series.length;
    values.push(Math.round(avg * 10) / 10);

    const date = refSlice[i]?.date || "";
    dates.push(date);

    if (i === 0) {
      labels.push("Inicio");
    } else if (months <= 6) {
      labels.push(`M${i}`);
    } else if (months <= 12) {
      labels.push(i % 2 === 0 ? `M${i}` : "");
    } else {
      labels.push(i % 12 === 0 ? `A${Math.floor(i / 12)}` : "");
    }
  }

  return { values, labels, dates };
}

const SimulationScreen = ({ portfolio, investments, stormChoice, onContinue }: Props) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[2]);
  const [simulated, setSimulated] = useState(false);

  // Get DB IDs for all investments
  const dbIds = useMemo(
    () => investments.map(inv => investmentToDbId[inv.id] || inv.id).filter(Boolean),
    [investments]
  );

  const { prices, loading } = useMonthlyPrices(dbIds);

  const sim = useMemo(() => {
    if (loading || Object.keys(prices).length === 0) {
      return { values: [100], labels: ["Inicio"], dates: [] };
    }
    return simulateFromRealData(prices, investments.map(i => i.id), selectedPeriod.months);
  }, [prices, loading, investments, selectedPeriod.months]);

  const finalValue = sim.values[sim.values.length - 1];
  const change = Math.round((finalValue - 100) * 10) / 10;
  const isPositive = change >= 0;

  const maxVal = Math.max(...sim.values);
  const minVal = Math.min(...sim.values);
  const range = maxVal - minVal || 1;

  // Find worst dip
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

  // Date range label
  const dateRange = sim.dates.length > 1
    ? `${sim.dates[0]} → ${sim.dates[sim.dates.length - 1]}`
    : "";

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-2xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>
          {simulated ? "📊 Resultados Reales" : "⏳ ¿Cuánto tiempo quieres simular?"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1" style={nunito}>
          {simulated
            ? `Data histórica real de los últimos ${selectedPeriod.label}`
            : "Basado en datos reales del mercado (2006–2026)"
          }
        </p>
      </div>

      {/* Period selector */}
      <div className="px-5 pb-4">
        <div className="flex gap-2">
          {periods.map((p) => (
            <motion.button
              key={p.key}
              onClick={() => { setSelectedPeriod(p); setSimulated(false); }}
              className="flex-1 py-3 rounded-2xl text-sm transition-colors border-2"
              style={{
                ...nunito,
                fontWeight: 700,
                borderColor: selectedPeriod.key === p.key ? CELESTE : "hsl(var(--border))",
                backgroundColor: selectedPeriod.key === p.key ? CELESTE + "15" : "hsl(var(--card))",
                color: selectedPeriod.key === p.key ? CELESTE : "hsl(var(--muted-foreground))",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {p.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="px-5 flex-1">
        <AnimatePresence mode="wait">
          {simulated ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Result cards */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 rounded-2xl p-4 border-2" style={{ borderColor: isPositive ? "#22c55e" : "#ef4444" }}>
                  <p className="text-xs text-muted-foreground" style={nunito}>Valor final</p>
                  <p className="text-3xl" style={{ ...nunito, fontWeight: 800, color: isPositive ? "#22c55e" : "#ef4444" }}>
                    ${finalValue}
                  </p>
                  <p className="text-sm" style={{ ...nunito, color: isPositive ? "#22c55e" : "#ef4444" }}>
                    {isPositive ? "+" : ""}{change}%
                  </p>
                </div>
                <div className="flex-1 rounded-2xl p-4 border-2" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs text-muted-foreground" style={nunito}>Invertido</p>
                  <p className="text-2xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>$100</p>
                  <p className="text-xs text-muted-foreground" style={nunito}>
                    Peor caída: {Math.round(worstDip)}%
                  </p>
                </div>
              </div>

              {/* Date range */}
              {dateRange && (
                <p className="text-[10px] text-muted-foreground text-center mb-2" style={nunito}>
                  📅 {dateRange}
                </p>
              )}

              {/* Chart */}
              <div className="rounded-2xl bg-card border-2 p-4 overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                <svg viewBox={`-10 -10 ${chartWidth + 20} ${chartHeight + 30}`} className="w-full" style={{ height: chartHeight + 40 }}>
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = chartHeight - pct * (chartHeight - 20);
                    const val = Math.round(minVal + pct * range);
                    return (
                      <g key={pct}>
                        <line x1={0} y1={y} x2={chartWidth} y2={y} stroke="hsl(var(--border))" strokeWidth={0.5} />
                        <text x={-8} y={y + 3} fontSize={8} fill="hsl(var(--muted-foreground))" textAnchor="end">{val}</text>
                      </g>
                    );
                  })}

                  {/* $100 baseline */}
                  <line
                    x1={0}
                    y1={chartHeight - ((100 - minVal) / range) * (chartHeight - 20)}
                    x2={chartWidth}
                    y2={chartHeight - ((100 - minVal) / range) * (chartHeight - 20)}
                    stroke="#888"
                    strokeWidth={0.5}
                    strokeDasharray="4,4"
                  />

                  <motion.polygon
                    points={areaPoints}
                    fill={isPositive ? "#22c55e15" : "#ef444415"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  />

                  <motion.polyline
                    points={points}
                    fill="none"
                    stroke={isPositive ? "#22c55e" : "#ef4444"}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />

                  <motion.circle
                    cx={chartWidth}
                    cy={chartHeight - ((finalValue - minVal) / range) * (chartHeight - 20)}
                    r={4}
                    fill={isPositive ? "#22c55e" : "#ef4444"}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5 }}
                  />
                </svg>
              </div>

              {/* Portfolio breakdown */}
              <div className="mt-4 space-y-2">
                <p className="text-xs tracking-widest text-muted-foreground" style={{ ...nunito, fontWeight: 700 }}>
                  TU PORTAFOLIO
                </p>
                {investments.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card">
                    <span>{inv.emoji}</span>
                    <span className="text-sm text-foreground flex-1 truncate" style={{ ...nunito, fontWeight: 600 }}>{inv.name}</span>
                    <span className="text-xs" style={{ ...nunito, color: CELESTE }}>{inv.annualReturn}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              className="flex flex-col items-center justify-center py-12 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.img
                src="/perspectiva2.png"
                alt="Helve"
                className="object-contain"
                style={{ width: 200, height: 200 }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              <div className="text-center px-8">
                <p className="text-lg text-foreground" style={{ ...nunito, fontWeight: 700 }}>
                  Vamos a ver cómo le fue a tu portafolio en los últimos{" "}
                  <span style={{ color: CELESTE }}>{selectedPeriod.label}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2" style={nunito}>
                  {loading ? "Cargando datos reales del mercado..." : "Datos reales de bolsas y bonos suizos, europeos y americanos"}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap justify-center px-4">
                {investments.map((inv) => (
                  <span key={inv.id} className="text-xs px-3 py-1.5 rounded-full bg-card border" style={nunito}>
                    {inv.emoji} {inv.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 py-6">
        {!simulated ? (
          <motion.button
            onClick={() => setSimulated(true)}
            className="w-full py-4 rounded-2xl tracking-widest text-sm text-white"
            style={{ ...nunito, backgroundColor: CELESTE, fontWeight: 900 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            {loading ? "CARGANDO DATA REAL..." : `🚀 SIMULAR ${selectedPeriod.label.toUpperCase()}`}
          </motion.button>
        ) : (
          <div className="space-y-3">
            <motion.button
              onClick={() => setSimulated(false)}
              className="w-full py-3 rounded-2xl tracking-widest text-sm border-2"
              style={{ ...nunito, borderColor: CELESTE, color: CELESTE, fontWeight: 700 }}
              whileTap={{ scale: 0.97 }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              🔄 PROBAR OTRO PERIODO
            </motion.button>
            <motion.button
              onClick={() => onContinue(Math.round(finalValue))}
              className="w-full py-4 rounded-2xl tracking-widest text-sm text-white"
              style={{ ...nunito, backgroundColor: CELESTE, fontWeight: 900 }}
              whileTap={{ scale: 0.97 }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              CONTINUAR
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SimulationScreen;
