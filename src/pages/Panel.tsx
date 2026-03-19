import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Investment } from "@/game/types";
import { availableInvestments } from "@/game/types";

function getRiskColor(risk: number): string {
  if (risk <= 3) return "text-primary";
  if (risk <= 6) return "text-accent";
  return "text-destructive";
}

function getRiskLabel(risk: number): string {
  if (risk <= 30) return "Low";
  if (risk <= 60) return "Medium";
  return "High";
}

function getSuggestions(profile: string, active: Investment[]): Investment[] {
  const activeIds = new Set(active.map((i) => i.id));
  const pool = availableInvestments.filter((i) => !activeIds.has(i.id));
  if (profile === "conservative") return pool.sort((a, b) => a.riskLevel - b.riskLevel).slice(0, 4);
  if (profile === "growth") return pool.sort((a, b) => b.annualReturn - a.annualReturn).slice(0, 4);
  return pool.sort((a, b) => Math.abs(5 - a.riskLevel) - Math.abs(5 - b.riskLevel)).slice(0, 4);
}

const Panel = () => {
  const navigate = useNavigate();
  const profile = (sessionStorage.getItem("helve-profile") as string) || "balanced";
  const [activePortfolio, setActivePortfolio] = useState<Investment[]>([]);
  const [mascotMessage, setMascotMessage] = useState(
    "Hey there! 👋 I've scouted some investments for you. Tap one to add it to your nest!"
  );

  const suggestions = useMemo(
    () => getSuggestions(profile, activePortfolio),
    [profile, activePortfolio]
  );

  const totalRisk = activePortfolio.length
    ? Math.round(activePortfolio.reduce((s, i) => s + i.riskLevel, 0) / activePortfolio.length * 10)
    : 0;

  const balance = 1000;
  const monthlyIncome = activePortfolio.reduce(
    (s, i) => s + Math.round((balance * i.annualReturn) / 100 / 12),
    0
  );

  const avgReturn = activePortfolio.length
    ? (activePortfolio.reduce((s, i) => s + i.annualReturn, 0) / activePortfolio.length).toFixed(1)
    : "0.0";

  const addInvestment = (inv: Investment) => {
    if (activePortfolio.length >= 4) {
      setMascotMessage("Your nest is full! 🪹 Remove one egg to make room for another.");
      return;
    }
    if (activePortfolio.find((i) => i.id === inv.id)) return;
    const next = [...activePortfolio, inv];
    setActivePortfolio(next);

    const newRisk = Math.round(next.reduce((s, i) => s + i.riskLevel, 0) / next.length * 10);
    if (newRisk > 70) {
      setMascotMessage("Careful! That's risky airspace! 🦅 Maybe pick something steadier to balance your flight?");
    } else if (newRisk < 20) {
      setMascotMessage("Very cozy nest! 🪺 Safe and warm — your eggs will hatch slowly but surely.");
    } else {
      setMascotMessage("Great pick! 🐦 Your flock is looking strong and balanced!");
    }
  };

  const removeInvestment = (id: string) => {
    setActivePortfolio((prev) => prev.filter((i) => i.id !== id));
    setMascotMessage("Egg removed from the nest! 🥚 Pick a new one from my suggestions.");
  };

  const handleSimulate = () => {
    const slots = activePortfolio.map((i) => i.type);
    sessionStorage.setItem("helve-portfolio-slots", JSON.stringify(slots));
    sessionStorage.setItem("helve-portfolio", JSON.stringify(activePortfolio));
    navigate("/");
  };

  const profileLabel = profile === "conservative" ? "Conservative 🛡️" : profile === "growth" ? "Growth 🦅" : "Balanced 🐦";

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">My Nest</p>
            <h1 className="text-2xl font-bold text-foreground mt-0.5">Dashboard</h1>
          </div>
          <motion.div
            className="w-12 h-12 rounded-full bg-card shadow-md overflow-hidden border-2 border-primary/20"
            whileTap={{ scale: 0.9 }}
          >
            <img src="/face.png" alt="Helve mascot" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            className="bg-card rounded-3xl p-4 shadow-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Balance</p>
            <p className="text-xl font-bold text-foreground mt-1">€{balance.toLocaleString()}</p>
            <p className="text-[10px] text-primary font-medium mt-0.5">+€{monthlyIncome}/mo</p>
          </motion.div>

          <motion.div
            className="bg-card rounded-3xl p-4 shadow-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Risk Level</p>
            <p className={`text-xl font-bold mt-1 ${totalRisk > 60 ? 'text-destructive' : totalRisk > 30 ? 'text-accent' : 'text-primary'}`}>
              {totalRisk}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{getRiskLabel(totalRisk)}</p>
          </motion.div>

          <motion.div
            className="bg-card rounded-3xl p-4 shadow-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Avg Return</p>
            <p className="text-xl font-bold text-primary mt-1">{avgReturn}%</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Annual</p>
          </motion.div>
        </div>
      </div>

      {/* Mascot Advisor */}
      <div className="px-5 pb-3">
        <motion.div
          className="bg-card rounded-3xl p-4 shadow-sm flex items-start gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 border border-primary/20">
            <img src="/face.png" alt="Mascot" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Your Flight Guide</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={mascotMessage}
                className="text-sm text-foreground leading-relaxed"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                {mascotMessage}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Two-Column: My Nest (left) + Suggestions (right) */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex gap-4">
          {/* LEFT: Active Portfolio (My Nest) */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                My Nest 🪺
              </h2>
              <span className="text-xs text-muted-foreground">{activePortfolio.length}/4</span>
            </div>

            {activePortfolio.length === 0 ? (
              <div className="bg-card/50 rounded-3xl p-6 text-center border-2 border-dashed border-border">
                <p className="text-3xl mb-2">🪹</p>
                <p className="text-sm text-muted-foreground">Your nest is empty!</p>
                <p className="text-xs text-muted-foreground mt-1">Pick investments from suggestions →</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {activePortfolio.map((inv) => (
                    <motion.div
                      key={inv.id}
                      className="bg-card rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-transform"
                      onClick={() => removeInvestment(inv.id)}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
                      layout
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                          {inv.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{inv.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-medium ${getRiskColor(inv.riskLevel)}`}>
                              R:{inv.riskLevel}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground">{inv.annualReturn}%</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">✕</span>
                      </div>
                      {inv.tag && (
                        <span className="inline-block mt-1.5 text-[9px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                          {inv.tag}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* RIGHT: Suggestions */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">
              Scouted 🔭
            </h2>
            <div className="space-y-2">
              {suggestions.map((inv) => (
                <motion.div
                  key={inv.id}
                  className="bg-card rounded-2xl p-3 shadow-sm cursor-pointer border-2 border-dashed border-border hover:border-primary/40 active:scale-[0.96] transition-all"
                  onClick={() => addInvestment(inv)}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {inv.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {inv.name} {inv.flag || ""}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-bold ${getRiskColor(inv.riskLevel)}`}>
                          R:{inv.riskLevel}
                        </span>
                        <span className="text-[10px] text-muted-foreground">|</span>
                        <span className="text-[10px] font-medium text-foreground">{inv.annualReturn}%</span>
                      </div>
                    </div>
                    <span className="text-primary text-lg">+</span>
                  </div>
                  {inv.tag && (
                    <span className="inline-block mt-1.5 text-[9px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
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
      <div className="px-5 pb-6 pt-3 space-y-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-2">
          <motion.button
            className="flex-1 bg-card text-foreground py-3 rounded-2xl text-xs font-bold shadow-sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActivePortfolio([]);
              setMascotMessage("Empty nest! 🪹 Let's scout fresh investments for your flock.");
            }}
          >
            🔄 Reset
          </motion.button>
          <motion.button
            className="flex-1 bg-card text-foreground py-3 rounded-2xl text-xs font-bold shadow-sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => setMascotMessage("The wisest birds stay perched during storms! 🦉 Patience builds the strongest nests.")}
          >
            🦉 Wisdom
          </motion.button>
          <motion.button
            className="flex-1 bg-card text-foreground py-3 rounded-2xl text-xs font-bold shadow-sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => setMascotMessage("Mix high-flyers with steady perchers! 🐦 A diverse flock weathers any storm.")}
          >
            💬 Ask Me
          </motion.button>
        </div>

        <motion.button
          className={`w-full py-4 rounded-3xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
            activePortfolio.length > 0
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          onClick={activePortfolio.length > 0 ? handleSimulate : undefined}
          whileHover={activePortfolio.length > 0 ? { scale: 1.02 } : {}}
          whileTap={activePortfolio.length > 0 ? { scale: 0.97 } : {}}
        >
          <img src="/face.png" alt="" className="w-6 h-6 rounded-full" />
          Take Flight 🦅
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Panel;
