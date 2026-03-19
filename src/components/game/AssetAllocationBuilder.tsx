import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { RiskProfile, AssetClass, AssetAllocation } from "@/game/types";
import {
  ASSET_CLASSES,
  RECOMMENDED_ALLOCATIONS,
  getAllocationRiskScore,
  getProfileRiskRange,
} from "@/game/types";

interface Props {
  profile: RiskProfile;
  onComplete: (allocation: AssetAllocation) => void;
}

const nunito = { fontFamily: "'Nunito', sans-serif" };

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

function DonutChart({ allocation, t }: { allocation: AssetAllocation; t: any }) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circ = 2 * Math.PI * r;
  const entries = ASSET_CLASSES.filter(c => allocation[c.key] > 0);
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto">
      {entries.map((c) => {
        const pct = allocation[c.key] / 100;
        const dash = pct * circ;
        const gap = circ - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={c.key}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={CLASS_COLORS[c.key]}
            strokeWidth={20}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            style={{ transition: "all 0.4s ease" }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={49} fill="hsl(var(--background))" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))" style={nunito}>
        {t("portfolio.risk")}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize={18} fontWeight={800} fill="hsl(var(--foreground))" style={nunito}>
        {getAllocationRiskScore(allocation).toFixed(1)}
      </text>
    </svg>
  );
}

type AlignmentLevel = "aligned" | "tooAggressive" | "tooConservative";

function getAlignment(profile: RiskProfile, alloc: AssetAllocation): AlignmentLevel {
  const score = getAllocationRiskScore(alloc);
  const [min, max] = getProfileRiskRange(profile);
  if (score < min) return "tooConservative";
  if (score > max) return "tooAggressive";
  return "aligned";
}

const AssetAllocationBuilder = ({ profile, onComplete }: Props) => {
  const { t } = useTranslation();
  const recommended = RECOMMENDED_ALLOCATIONS[profile];
  const [alloc, setAlloc] = useState<AssetAllocation>({ ...recommended });

  const total = ASSET_CLASSES.reduce((s, c) => s + alloc[c.key], 0);
  const remaining = 100 - total;
  const alignment = useMemo(() => getAlignment(profile, alloc), [profile, alloc]);

  const handleSlider = (key: AssetClass, value: number) => {
    const current = alloc[key];
    const otherTotal = total - current;
    if (otherTotal + value > 100) value = 100 - otherTotal;
    setAlloc(prev => ({ ...prev, [key]: Math.max(0, Math.min(value, 100)) }));
  };

  const handleReset = () => setAlloc({ ...recommended });

  const pLabel = t(`portfolio.profileLabels.${profile}`, { returnObjects: true }) as { name: string; emoji: string; desc: string };

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      {/* Header */}
      <div className="px-5 pt-8 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div>
          <div>
            <h2 className="text-xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>{pLabel.name}</h2>
            <p className="text-sm text-muted-foreground" style={nunito}>{pLabel.desc}</p>
          </div>
        </div>
      </div>

      {/* Donut + Legend */}
      <div className="px-5 pb-2">
        <DonutChart allocation={alloc} t={t} />
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {ASSET_CLASSES.filter(c => alloc[c.key] > 0).map(c => (
            <div key={c.key} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLASS_COLORS[c.key] }} />
              <span className="text-[10px] text-muted-foreground" style={nunito}>
                {c.emoji} {t(`allocation.classes.${c.key}`)} {alloc[c.key]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="px-5 flex-1 space-y-3 pb-2 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest text-muted-foreground" style={{ ...nunito, fontWeight: 700 }}>
            {t("allocation.title")}
          </p>
          <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-primary" style={nunito}>
            <RotateCcw className="w-3 h-3" /> {t("allocation.reset")}
          </button>
        </div>

        {ASSET_CLASSES.map((c) => (
          <div key={c.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{c.emoji}</span>
                <div>
                  <span className="text-sm font-bold text-foreground" style={nunito}>
                    {t(`allocation.classes.${c.key}`)}
                  </span>
                  <p className="text-[9px] text-muted-foreground leading-tight" style={nunito}>
                    {t(`allocation.classDesc.${c.key}`)}
                  </p>
                </div>
              </div>
              <span className="text-base font-black min-w-[3ch] text-right" style={{ ...nunito, color: CLASS_COLORS[c.key] }}>
                {alloc[c.key]}%
              </span>
            </div>
            <Slider
              value={[alloc[c.key]]}
              onValueChange={([v]) => handleSlider(c.key, v)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        ))}

        {/* Remaining */}
        {remaining !== 0 && (
          <motion.div
            className="text-center py-1.5 rounded-xl text-sm font-bold"
            style={{
              ...nunito,
              backgroundColor: remaining < 0 ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--accent) / 0.2)",
              color: remaining < 0 ? "hsl(var(--destructive))" : "hsl(var(--accent-foreground))",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {remaining > 0
              ? t("allocation.remaining", { pct: remaining })
              : t("allocation.over", { pct: Math.abs(remaining) })}
          </motion.div>
        )}
      </div>

      {/* Alignment feedback */}
      <AnimatePresence>
        {total === 100 && (
          <motion.div className="px-5 pb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div
              className="rounded-2xl p-3 flex items-start gap-2"
              style={{
                backgroundColor: alignment === "aligned" ? "hsl(var(--primary) / 0.1)" : "hsl(38, 92%, 50%, 0.1)",
                border: `2px solid ${alignment === "aligned" ? "hsl(var(--primary))" : "hsl(38, 92%, 50%)"}`,
              }}
            >
              {alignment === "aligned"
                ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(38, 92%, 50%)" }} />}
              <div>
                <p className="text-xs font-bold text-foreground" style={nunito}>
                  {t(`allocation.feedback.${alignment}.title`)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5" style={nunito}>
                  {t(`allocation.feedback.${alignment}.desc`, { profile: pLabel.name })}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="px-5 py-5">
        <motion.button
          onClick={() => total === 100 && onComplete(alloc)}
          className="w-full py-4 rounded-2xl tracking-widest text-sm"
          style={{
            ...nunito, fontWeight: 900,
            backgroundColor: total === 100 ? "hsl(var(--primary))" : "hsl(var(--muted))",
            color: total === 100 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            cursor: total === 100 ? "pointer" : "not-allowed",
          }}
          whileTap={total === 100 ? { scale: 0.97 } : {}}
        >
          {total !== 100 ? t("allocation.mustEqual100") : t("portfolio.simulate")}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default AssetAllocationBuilder;
