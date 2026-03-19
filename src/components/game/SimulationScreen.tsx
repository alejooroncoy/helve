import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PortfolioSlot, Investment } from "@/game/types";
import { simulateRealGrowth } from "@/game/types";

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

function simulateMonthly(
  types: PortfolioSlot[],
  stormChoice: "stay" | "sell" | null,
  months: number
): { values: number[]; labels: string[] } {
  if (types.length === 0) return { values: [100], labels: ["Inicio"] };

  const getMonthlyReturn = (type: PortfolioSlot): number => {
    switch (type) {
      case "safe": return 0.025 / 12;
      case "balanced": return 0.062 / 12;
      case "growth": return 0.094 / 12;
    }
  };

  const getMonthlyVol = (type: PortfolioSlot): number => {
    switch (type) {
      case "safe": return 0.03 / Math.sqrt(12);
      case "balanced": return 0.15 / Math.sqrt(12);
      case "growth": return 0.22 / Math.sqrt(12);
    }
  };

  const avgReturn = types.reduce((s, t) => s + getMonthlyReturn(t), 0) / types.length;
  const avgVol = types.reduce((s, t) => s + getMonthlyVol(t), 0) / types.length;

  const seed = types.reduce((s, t) => s + (t === "safe" ? 1 : t === "balanced" ? 3 : 7), 0);

  let value = 100;
  const values = [100];
  const labels = ["Inicio"];

  const crashMonth = Math.floor(months * 0.6);

  for (let m = 1; m <= months; m++) {
    const noise = Math.sin(seed * 1000 + m * 137) * 0.5;
    let ret = avgReturn + avgVol * noise;

    // Simulate a dip mid-way
    if (m === crashMonth) {
      ret = -avgVol * 2.5;
      if (stormChoice === "sell") {
        ret = -avgVol * 1.5;
      }
    }

    if (stormChoice === "sell" && m > crashMonth) {
      ret = 0.025 / 12;
    }

    value = value * (1 + ret);
    values.push(Math.round(value * 10) / 10);

    if (months <= 6) {
      labels.push(`M${m}`);
    } else if (months <= 12) {
      labels.push(m % 2 === 0 ? `M${m}` : "");
    } else {
      labels.push(m % 12 === 0 ? `A${m / 12}` : "");
    }
  }

  return { values, labels };
}

const SimulationScreen = ({ portfolio, investments, stormChoice, onContinue }: Props) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[2]);
  const [simulated, setSimulated] = useState(false);

  const sim = simulateMonthly(portfolio, stormChoice, selectedPeriod.months);
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
    const x = (i / (sim.values.length - 1)) * chartWidth;
    const y = chartHeight - ((v - minVal) / range) * (chartHeight - 20);
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

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
          {simulated ? "📊 Resultados" : "⏳ ¿Cuánto tiempo quieres simular?"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1" style={nunito}>
          {simulated
            ? `Simulación de ${selectedPeriod.label} con tu portafolio`
            : "Escoge el periodo y mira cómo crece tu inversión"
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

              {/* Chart */}
              <div className="rounded-2xl bg-card border-2 p-4 overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                <svg viewBox={`-10 -10 ${chartWidth + 20} ${chartHeight + 30}`} className="w-full" style={{ height: chartHeight + 40 }}>
                  {/* Grid lines */}
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

                  {/* Area fill */}
                  <motion.polygon
                    points={areaPoints}
                    fill={isPositive ? "#22c55e15" : "#ef444415"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  />

                  {/* Line */}
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

                  {/* End dot */}
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
              {/* Bird mascot */}
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
                  Vamos a ver cómo le va a tu portafolio en{" "}
                  <span style={{ color: CELESTE }}>{selectedPeriod.label}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2" style={nunito}>
                  Recuerda: los mercados suben y bajan. Lo importante es el largo plazo.
                </p>
              </div>

              {/* Mini portfolio summary */}
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
          >
            🚀 SIMULAR {selectedPeriod.label.toUpperCase()}
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
