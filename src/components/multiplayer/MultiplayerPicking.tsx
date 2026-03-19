import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Check, Users } from "lucide-react";
import { ASSET_CLASSES } from "@/game/types";
import type { AssetClass } from "@/game/types";
import type { useMultiplayer } from "@/hooks/useMultiplayer";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const MAX_PICKS = 5;

const CLASS_COLORS: Record<AssetClass, string> = {
  bonds: "hsl(210, 60%, 55%)", equity: "hsl(145, 58%, 36%)", gold: "hsl(38, 92%, 50%)",
  fx: "hsl(200, 70%, 50%)", swissStocks: "hsl(0, 72%, 51%)", usStocks: "hsl(220, 70%, 50%)",
  crypto: "hsl(270, 60%, 55%)", cleanEnergy: "hsl(150, 60%, 45%)",
};

interface Props { mp: ReturnType<typeof useMultiplayer>; }

const MultiplayerPicking = ({ mp }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<AssetClass[]>([]);
  const isHost = user?.id === mp.room?.host_user_id;

  const toggleCategory = (key: AssetClass) => {
    setSelected(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, key];
    });
  };

  const handleReady = async () => {
    await mp.updatePortfolio(selected as any);
    await mp.setReady(true);
  };

  const allReady = mp.players.length >= 2 && mp.players.every(p => p.is_ready);
  if (allReady && isHost) mp.startSimulation();

  return (
    <motion.div className="min-h-screen flex flex-col px-5 py-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-center mb-5">
        <h1 className="text-xl font-black text-foreground" style={nunito}>{t("multiplayer.pickAssets")}</h1>
        <p className="text-xs text-muted-foreground mt-1" style={nunito}>{t("multiplayer.pickCategoriesDesc", { max: MAX_PICKS })}</p>
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {Array.from({ length: MAX_PICKS }).map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all"
            style={{ borderColor: i < selected.length ? "hsl(var(--primary))" : "hsl(var(--border))",
              background: i < selected.length ? "hsl(var(--primary) / 0.15)" : "transparent",
              color: i < selected.length ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {i < selected.length ? <Check className="w-3 h-3" /> : i + 1}
          </div>
        ))}
      </div>

      {/* Category grid */}
      <div className="flex-1 space-y-2 mb-4">
        {ASSET_CLASSES.map((cls, i) => {
          const isSelected = selected.includes(cls.key);
          return (
            <motion.button key={cls.key} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
              style={{
                background: isSelected ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
                border: isSelected ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                boxShadow: isSelected ? "0 4px 12px hsl(var(--primary) / 0.15)" : "0 2px 8px hsl(0 0% 0% / 0.05)",
              }}
              onClick={() => !mp.myPlayer?.is_ready && toggleCategory(cls.key)}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <span className="text-2xl">{cls.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-foreground" style={nunito}>{t(`allocation.classes.${cls.key}`)}</span>
                <p className="text-[10px] text-muted-foreground leading-tight" style={nunito}>{t(`allocation.classDesc.${cls.key}`)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: CLASS_COLORS[cls.key] }}>
                  {t("portfolio.risk")} {cls.riskWeight}/10
                </span>
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))", background: isSelected ? "hsl(var(--primary))" : "transparent" }}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Players */}
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
        <motion.button className="w-full py-4 rounded-3xl font-black text-base shadow-lg" style={{ ...nunito,
          background: selected.length > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
          color: selected.length > 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
          cursor: selected.length > 0 ? "pointer" : "not-allowed",
        }} onClick={selected.length > 0 ? handleReady : undefined}
          whileTap={selected.length > 0 ? { scale: 0.97 } : {}}>
          ✅ {t("multiplayer.ready")} ({selected.length}/{MAX_PICKS})
        </motion.button>
      ) : (
        <div className="w-full py-4 rounded-3xl bg-primary/10 text-center">
          <span className="text-sm font-bold text-primary" style={nunito}>{t("multiplayer.waitingOthers")}</span>
        </div>
      )}
    </motion.div>
  );
};

export default MultiplayerPicking;
