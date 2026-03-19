import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useInstrumentStats } from "@/hooks/useMarketData";
import { Check, Plus, X, Shield, TrendingUp, BarChart2, Users } from "lucide-react";
import type { Investment } from "@/game/types";
import type { useMultiplayer } from "@/hooks/useMultiplayer";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const MAX_NEST = 5;

const investmentToDbId: Record<string, string> = {
  "ch-bond-aaa": "ch-bond-aaa", "global-bond": "global-bond-agg", "ch-govt-10y": "ch-govt-10y",
  "smi-index": "smi-index", "eurostoxx50": "eurostoxx50", "gold-chf": "gold-chf",
  "nestle": "nesn-ch", "novartis": "novn-ch", "green-energy": "green-energy",
  "djia-index": "djia-index", "dax-index": "dax-index",
  "apple": "aapl-us", "microsoft": "msft-us", "nvidia": "nvda-us",
  "logitech": "logn-ch", "ubs": "ubsg-ch", "amazon": "amzn-us",
};

function getTypeIcon(type: string) {
  if (type === "safe") return <Shield className="w-4 h-4" />;
  if (type === "balanced") return <BarChart2 className="w-4 h-4" />;
  return <TrendingUp className="w-4 h-4" />;
}

function getTypeColor(type: string) {
  if (type === "safe") return "hsl(var(--primary))";
  if (type === "balanced") return "hsl(var(--accent))";
  return "hsl(0, 72%, 51%)";
}

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const MultiplayerPicking = ({ mp }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Investment[]>([]);
  const assets = (mp.room?.available_assets || []) as Investment[];
  const isHost = user?.id === mp.room?.host_user_id;

  const dbIds = useMemo(() => assets.map(a => investmentToDbId[a.id] || a.id), [assets]);
  const { stats } = useInstrumentStats(dbIds);

  const enriched = useMemo(() =>
    assets.map(a => {
      const dbId = investmentToDbId[a.id] || a.id;
      const s = stats[dbId];
      if (s) return { ...a, annualReturn: s.avgAnnualReturn, riskLevel: s.riskLevel };
      return a;
    }), [assets, stats]);

  const toggleAsset = (inv: Investment) => {
    setSelected(prev => {
      const exists = prev.find(p => p.id === inv.id);
      if (exists) return prev.filter(p => p.id !== inv.id);
      if (prev.length >= MAX_NEST) return prev;
      return [...prev, inv];
    });
  };

  const handleReady = async () => {
    await mp.updatePortfolio(selected);
    await mp.setReady(true);
  };

  const allReady = mp.players.length >= 2 && mp.players.every(p => p.is_ready);

  // Auto-start when all ready (host)
  if (allReady && isHost) {
    mp.startSimulation();
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col px-5 py-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    >
      <div className="text-center mb-5">
        <h1 className="text-xl font-black text-foreground" style={nunito}>
          {t("multiplayer.pickAssets")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1" style={nunito}>
          {t("multiplayer.pickAssetsDesc", { max: MAX_NEST })}
        </p>
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {Array.from({ length: MAX_NEST }).map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all"
            style={{
              borderColor: i < selected.length ? "hsl(var(--primary))" : "hsl(var(--border))",
              background: i < selected.length ? "hsl(var(--primary) / 0.15)" : "transparent",
              color: i < selected.length ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            {i < selected.length ? <Check className="w-3 h-3" /> : i + 1}
          </div>
        ))}
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pb-2">
        {enriched.map((inv, i) => {
          const isSelected = selected.some(s => s.id === inv.id);
          return (
            <motion.button
              key={inv.id}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
              style={{
                background: isSelected ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
                border: isSelected ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                boxShadow: isSelected ? "0 4px 12px hsl(var(--primary) / 0.15)" : "0 2px 8px hsl(0 0% 0% / 0.05)",
              }}
              onClick={() => !mp.myPlayer?.is_ready && toggleAsset(inv)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="text-2xl">{inv.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {inv.flag && <span className="text-xs">{inv.flag}</span>}
                  <span className="text-sm font-bold text-foreground truncate" style={nunito}>
                    {inv.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span style={{ color: getTypeColor(inv.type) }} className="flex items-center gap-1 text-[10px] font-bold">
                    {getTypeIcon(inv.type)} {inv.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Risk {inv.riskLevel}/10
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black" style={{ ...nunito, color: inv.annualReturn >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                  {inv.annualReturn > 0 ? "+" : ""}{inv.annualReturn.toFixed(1)}%
                </span>
                <span className="block text-[10px] text-muted-foreground">/yr</span>
              </div>
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: isSelected ? "hsl(var(--primary))" : "transparent",
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Player status */}
      <div className="flex items-center gap-2 mb-3 justify-center">
        <Users className="w-3 h-3 text-muted-foreground" />
        {mp.players.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${p.is_ready ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <span className="text-[10px] text-muted-foreground" style={nunito}>{p.display_name}</span>
          </div>
        ))}
      </div>

      {/* Ready button */}
      {!mp.myPlayer?.is_ready ? (
        <motion.button
          className="w-full py-4 rounded-3xl font-black text-base shadow-lg"
          style={{
            ...nunito,
            background: selected.length > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
            color: selected.length > 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            cursor: selected.length > 0 ? "pointer" : "not-allowed",
          }}
          onClick={selected.length > 0 ? handleReady : undefined}
          whileHover={selected.length > 0 ? { scale: 1.02 } : {}}
          whileTap={selected.length > 0 ? { scale: 0.97 } : {}}
        >
          ✅ {t("multiplayer.ready")} ({selected.length}/{MAX_NEST})
        </motion.button>
      ) : (
        <div className="w-full py-4 rounded-3xl bg-primary/10 text-center">
          <span className="text-sm font-bold text-primary" style={nunito}>
            {t("multiplayer.waitingOthers")}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default MultiplayerPicking;
