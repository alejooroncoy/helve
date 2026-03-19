import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
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
  realEstate: "hsl(25, 70%, 50%)",
  alternatives: "hsl(280, 60%, 55%)",
};

function DonutChart({ allocation }: { allocation: AssetAllocation }) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circ = 2 * Math.PI * r;
  const entries = ASSET_CLASSES.filter(c => allocation[c.key] > 0);
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto">
      {entries.map((c) => {
        const pct = allocation[c.key] / 100;
        const dash = pct * circ;
        const gap = circ - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={c.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={CLASS_COLORS[c.key]}
            strokeWidth={22}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            style={{ transition: "all 0.4s ease" }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={48} fill="hsl(var(--background))" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))" style={nunito}>
        Risk
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={20} fontWeight={800} fill="hsl(var(--foreground))" style={nunito}>
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

  const total = alloc.bonds + alloc.equity + alloc.gold + alloc.realEstate + alloc.alternatives;
  const remaining = 100 - total;
  const alignment = useMemo(() => getAlignment(profile, alloc), [profile, alloc]);
  const riskScore = useMemo(() => getAllocationRiskScore(alloc), [alloc]);

  const handleSlider = (key: AssetClass, value: number) => {
    const current = alloc[key];
    const diff = value - current;
    const otherTotal = total - current;
    if (otherTotal + value > 100) {
      value = 100 - otherTotal;
    }
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
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{pLabel.emoji}</span>
          <div>
            <h2 className="text-xl text-foreground" style={{ ...nunito, fontWeight: 800 }}>{pLabel.name}</h2>
            <p className="text-sm text-muted-foreground" style={nunito}>{pLabel.desc}</p>
          </div>
        </div>
      </div>

      {/* Donut + Legend */}
      <div className="px-5 pb-3">
        <DonutChart allocation={alloc} />
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {ASSET_CLASSES.map(c => (
            alloc[c.key] > 0 && (
              <div key={c.key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CLASS_COLORS[c.key] }} />
                <span className="text-xs text-muted-foreground" style={nunito}>
                  {c.emoji} {t(`allocation.classes.${c.key}`)} {alloc[c.key]}%
                </span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="px-5 flex-1 space-y-4 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest text-muted-foreground" style={{ ...nunito, fontWeight: 700 }}>
            {t("allocation.title")}
          </p>
          <button
            onClick={handleReset}
            className="text-[10px] text-primary underline"
            style={nunito}
          >
            {t("allocation.reset")}
          </button>
        </div>

        {ASSET_CLASSES.map((c) => (
          <div key={c.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{c.emoji}</span>
                <div>
                  <span className="text-sm font-bold text-foreground" style={nunito}>
                    {t(`allocation.classes.${c.key}`)}
                  </span>
                  <p className="text-[10px] text-muted-foreground" style={nunito}>
                    {t(`allocation.classDesc.${c.key}`)}
                  </p>
                </div>
              </div>
              <span
                className="text-lg font-black min-w-[3ch] text-right"
                style={{ ...nunito, color: CLASS_COLORS[c.key] }}
              >
                {alloc[c.key]}%
              </span>
            </div>
            <Slider
              value={[alloc[c.key]]}
              onValueChange={([v]) => handleSlider(c.key, v)}
              max={100}
              step={5}
              className="w-full"
              style={{ "--slider-color": CLASS_COLORS[c.key] } as React.CSSProperties}
            />
          </div>
        ))}

        {/* Remaining indicator */}
        {remaining !== 0 && (
          <motion.div
            className="text-center py-2 rounded-xl"
            style={{
              backgroundColor: remaining < 0 ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--accent) / 0.3)",
              color: remaining < 0 ? "hsl(var(--destructive))" : "hsl(var(--accent-foreground))",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-sm font-bold" style={nunito}>
              {remaining > 0
                ? t("allocation.remaining", { pct: remaining })
                : t("allocation.over", { pct: Math.abs(remaining) })}
            </span>
          </motion.div>
        )}
      </div>

      {/* Alignment feedback */}
      <AnimatePresence>
        {total === 100 && (
          <motion.div
            className="px-5 pb-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                backgroundColor: alignment === "aligned"
                  ? "hsl(var(--primary) / 0.1)"
                  : "hsl(38, 92%, 50%, 0.1)",
                border: `2px solid ${alignment === "aligned" ? "hsl(var(--primary))" : "hsl(38, 92%, 50%)"}`,
              }}
            >
              {alignment === "aligned" ? (
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
              ) : (
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "hsl(38, 92%, 50%)" }} />
              )}
              <div>
                <p className="text-sm font-bold text-foreground" style={nunito}>
                  {t(`allocation.feedback.${alignment}.title`)}
                </p>
                <p className="text-xs text-muted-foreground mt-1" style={nunito}>
                  {t(`allocation.feedback.${alignment}.desc`, { profile: pLabel.name })}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="px-5 py-6">
        <motion.button
          onClick={() => total === 100 && onComplete(alloc)}
          className="w-full py-4 rounded-2xl tracking-widest text-sm"
          style={{
            ...nunito,
            fontWeight: 900,
            backgroundColor: total === 100 ? "hsl(var(--primary))" : "hsl(var(--muted))",
            color: total === 100 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            cursor: total === 100 ? "pointer" : "not-allowed",
          }}
          whileTap={total === 100 ? { scale: 0.97 } : {}}
        >
          {total !== 100
            ? t("allocation.mustEqual100")
            : t("portfolio.simulate")}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default AssetAllocationBuilder;
