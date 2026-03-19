import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PortfolioSlot } from "@/game/types";

interface Props {
  onComplete: (portfolio: PortfolioSlot[]) => void;
}

const options: { type: PortfolioSlot; emoji: string; label: string; desc: string }[] = [
  { type: "safe", emoji: "🛡️", label: "Safe", desc: "Low risk, steady returns" },
  { type: "balanced", emoji: "🌿", label: "Balanced", desc: "Moderate risk and growth" },
  { type: "growth", emoji: "🌳", label: "Growth", desc: "Higher risk, higher returns" },
];

const feedbackMessages: Record<string, string> = {
  "safe,safe,safe": "Very safe — but growth will be slow",
  "growth,growth,growth": "High risk! Big gains possible, but bumpy",
  "safe,balanced,growth": "Great balance!",
  "balanced,balanced,balanced": "Steady and even — nice choice",
};

function getFeedback(portfolio: PortfolioSlot[]): string {
  const sorted = [...portfolio].sort().join(",");
  if (feedbackMessages[sorted]) return feedbackMessages[sorted];

  const growthCount = portfolio.filter((s) => s === "growth").length;
  const safeCount = portfolio.filter((s) => s === "safe").length;

  if (growthCount >= 2) return "This adds more risk";
  if (safeCount >= 2) return "Safer, but slower growth";
  return "Good balance";
}

const PortfolioBuilder = ({ onComplete }: Props) => {
  const [slots, setSlots] = useState<PortfolioSlot[]>([]);
  const [feedback, setFeedback] = useState("");

  const addSlot = (type: PortfolioSlot) => {
    if (slots.length >= 3) return;
    const next = [...slots, type];
    setSlots(next);
    if (next.length <= 3) {
      setFeedback(next.length < 3 ? `${3 - next.length} slot${3 - next.length > 1 ? "s" : ""} left` : getFeedback(next));
    }
  };

  const removeSlot = (index: number) => {
    const next = slots.filter((_, i) => i !== index);
    setSlots(next);
    setFeedback(`${3 - next.length} slot${3 - next.length > 1 ? "s" : ""} left`);
  };

  const riskLevel = slots.reduce((sum, s) => sum + (s === "safe" ? 1 : s === "balanced" ? 2 : 3), 0);
  const growthLevel = slots.reduce((sum, s) => sum + (s === "safe" ? 1 : s === "balanced" ? 2 : 3), 0);
  const maxLevel = 9;

  return (
    <motion.div
      className="flex flex-col min-h-screen px-6 py-8"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <h2 className="text-3xl font-serif text-center text-foreground mb-2">Build Your Garden</h2>
      <p className="text-center text-muted-foreground mb-8">Pick 3 to fill your portfolio</p>

      {/* Slots */}
      <div className="flex justify-center gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center text-3xl cursor-pointer transition-colors ${
              slots[i] ? "border-primary bg-helve-green-light" : "border-border bg-muted/50"
            }`}
            onClick={() => slots[i] && removeSlot(i)}
            whileTap={slots[i] ? { scale: 0.9 } : {}}
            layout
          >
            {slots[i] && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                {options.find((o) => o.type === slots[i])?.emoji}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Bars */}
      <div className="max-w-sm mx-auto w-full mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-14">Risk</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              animate={{ width: `${(riskLevel / maxLevel) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-14">Growth</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${(growthLevel / maxLevel) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto w-full flex-1">
        {options.map((opt, i) => (
          <motion.button
            key={opt.type}
            className="bg-card p-5 rounded-3xl text-left shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 disabled:opacity-40"
            onClick={() => addSlot(opt.type)}
            disabled={slots.length >= 3}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            whileHover={{ scale: slots.length < 3 ? 1.02 : 1 }}
            whileTap={{ scale: slots.length < 3 ? 0.97 : 1 }}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <div>
              <div className="font-medium text-foreground">{opt.label}</div>
              <div className="text-sm text-muted-foreground">{opt.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Feedback + Continue */}
      <div className="mt-6 text-center">
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.p
              key={feedback}
              className="text-muted-foreground mb-4"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>

        {slots.length === 3 && (
          <motion.button
            className="bg-primary text-primary-foreground px-10 py-4 rounded-4xl text-lg font-medium shadow-lg"
            onClick={() => onComplete(slots)}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Plant Your Garden
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default PortfolioBuilder;
