import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Medal, Star, ArrowLeft, RotateCcw } from "lucide-react";
import type { useMultiplayer } from "@/hooks/useMultiplayer";

const nunito = { fontFamily: "'Nunito', sans-serif" };

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const RANK_LABELS = ["1st", "2nd", "3rd", "4th"];
const RANK_COLORS = [
  "hsl(38, 92%, 50%)", // gold
  "hsl(0, 0%, 70%)",   // silver
  "hsl(25, 60%, 45%)", // bronze
  "hsl(var(--muted-foreground))",
];

const MultiplayerResults = ({ mp }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const ranked = useMemo(() =>
    [...mp.players]
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .map((p, i) => ({ ...p, rank: i + 1 })),
    [mp.players]
  );

  const myRank = ranked.find(p => p.user_id === user?.id);
  const winner = ranked[0];
  const INITIAL = 1000;

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center px-5 py-8"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    >
      {/* Winner celebration */}
      <motion.div
        className="text-center mb-6"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
      >
        <div className="text-6xl mb-3">🏆</div>
        <h1 className="text-2xl font-black text-foreground" style={nunito}>
          {t("multiplayer.gameOver")}
        </h1>
        {winner && (
          <p className="text-sm text-muted-foreground mt-1" style={nunito}>
            {winner.display_name} {t("multiplayer.wins")}!
          </p>
        )}
      </motion.div>

      {/* Rankings */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        {ranked.map((p, i) => {
          const isMe = p.user_id === user?.id;
          const pctChange = ((p.final_score || INITIAL) - INITIAL) / INITIAL * 100;
          const decisions = (p.decisions as any[]) || [];

          return (
            <motion.div
              key={p.id}
              className="rounded-3xl p-4 shadow-lg"
              style={{
                background: isMe ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                border: isMe ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-black" style={{ ...nunito, color: RANK_COLORS[i] || "hsl(var(--muted-foreground))" }}>{RANK_LABELS[i] || `${i + 1}`}</span>
                <div className="flex-1">
                  <p className="text-sm font-black text-foreground" style={nunito}>
                    {p.display_name} {isMe ? `(${t("multiplayer.you")})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground" style={nunito}>
                    {decisions.length} {t("multiplayer.decisions")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{
                    ...nunito,
                    color: pctChange >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))",
                  }}>
                    CHF {(p.final_score || INITIAL).toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{
                    color: pctChange >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))",
                  }}>
                    {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Decision summary */}
              {decisions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex gap-2 flex-wrap">
                    {decisions.map((d: any, di: number) => (
                      <span
                        key={di}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{
                          ...nunito,
                          background: d.decision === "hold"
                            ? "hsl(var(--primary) / 0.15)"
                            : "hsl(var(--destructive) / 0.15)",
                          color: d.decision === "hold"
                            ? "hsl(var(--primary))"
                            : "hsl(var(--destructive))",
                        }}
                      >
                        {d.decision === "hold" ? "💎 Hold" : "📉 Sold"} #{di + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Learning insight */}
      <motion.div
        className="w-full max-w-sm bg-card rounded-3xl p-5 shadow-md mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">🦉</div>
          <div>
            <p className="text-sm font-bold text-foreground mb-1" style={nunito}>
              {t("multiplayer.insight")}
            </p>
            <p className="text-xs text-muted-foreground" style={nunito}>
              {t("multiplayer.insightText")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <motion.button
          className="w-full py-4 rounded-3xl bg-primary text-primary-foreground font-black text-base shadow-lg flex items-center justify-center gap-2"
          style={nunito}
          onClick={() => { mp.leaveRoom(); }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          <RotateCcw className="w-4 h-4" />
          {t("multiplayer.playAgain")}
        </motion.button>
        <motion.button
          className="w-full py-3 rounded-3xl bg-card text-foreground font-bold text-sm border border-border flex items-center justify-center gap-2"
          style={nunito}
          onClick={() => navigate("/panel")}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("multiplayer.backToNest")}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MultiplayerResults;
