import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, ArrowLeft, RotateCcw, Lightbulb, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { useMultiplayer } from "@/hooks/useMultiplayer";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const CELESTE = "#5BB8F5";
const INITIAL = 1000;

const RANK_COLORS = [
  "hsl(38,92%,50%)",
  "hsl(0,0%,65%)",
  "hsl(25,60%,45%)",
  "hsl(var(--muted-foreground))",
];
const RANK_LABELS = ["1st", "2nd", "3rd", "4th"];

// Neutral palette — not red/green
const HOLD_COLOR  = "#60a5fa"; // blue
const SELL_COLOR  = "#fb923c"; // orange
const GAIN_COLOR  = "#60a5fa"; // blue
const LOSS_COLOR  = "#fb923c"; // orange
const FLAT_COLOR  = "#94a3b8"; // slate

interface DecisionMeta {
  title?: string;
  holdImpact?: number;
  sellImpact?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  decision: string;
  eventIndex: number;
}

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const MultiplayerResults = ({ mp }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  const ranked = useMemo(() =>
    [...mp.players]
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .map((p, i) => ({ ...p, rank: i + 1 })),
    [mp.players]
  );

  const winner = ranked[0];
  const openPlayer = openPlayerId ? ranked.find(p => p.id === openPlayerId) : null;

  return (
    <motion.div
      className="min-h-screen flex flex-col px-5 pt-5 pb-8"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    >
      {/* Language switcher — centered top */}
      <div className="flex justify-center mb-5">
        <LanguageSwitcher />
      </div>

      {/* Trophy + title */}
      <motion.div
        className="text-center mb-5"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
      >
        <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${CELESTE}18` }}>
          <Trophy className="w-9 h-9" style={{ color: CELESTE }} />
        </div>
        <h1 className="text-2xl font-black text-foreground" style={nunito}>
          {t("multiplayer.gameOver")}
        </h1>
        {winner && (
          <p className="text-sm text-muted-foreground mt-1" style={nunito}>
            {winner.display_name} {t("multiplayer.wins")}!
          </p>
        )}
      </motion.div>

      {/* Rankings — flex-1 to fill space */}
      <div className="flex-1 flex flex-col gap-3 mb-5">
        {ranked.map((p, i) => {
          const isMe = p.user_id === user?.id;
          const pctChange = ((p.final_score || INITIAL) - INITIAL) / INITIAL * 100;
          const decisions: DecisionMeta[] = (p.decisions as any[]) || [];
          const holds = decisions.filter(d => d.decision === "hold").length;
          const sells = decisions.filter(d => d.decision === "sell").length;
          const positive = pctChange >= 0;

          return (
            <motion.div
              key={p.id}
              className="rounded-3xl p-4 shadow-sm cursor-pointer"
              style={{
                background: isMe ? `${CELESTE}12` : "hsl(var(--card))",
                border: `2px solid ${isMe ? CELESTE : "hsl(var(--border))"}`,
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              onClick={() => decisions.length > 0 && setOpenPlayerId(p.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-black w-9 flex-shrink-0"
                  style={{ ...nunito, color: RANK_COLORS[i] }}>
                  {RANK_LABELS[i] || `${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground truncate" style={nunito}>
                    {p.display_name}{isMe ? ` (${t("multiplayer.you")})` : ""}
                  </p>
                  {decisions.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5 flex-wrap">
                        {decisions.map((d, di) => (
                          <div key={di} className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: d.decision === "hold" ? HOLD_COLOR : SELL_COLOR }} />
                        ))}
                      </div>
                      <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))", ...nunito }}>
                        {holds}H · {sells}S
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black" style={{ ...nunito, color: isMe ? CELESTE : "hsl(var(--foreground))" }}>
                    CHF {(p.final_score || INITIAL).toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end gap-0.5">
                    {positive
                      ? <TrendingUp className="w-3 h-3" style={{ color: GAIN_COLOR }} />
                      : <TrendingDown className="w-3 h-3" style={{ color: LOSS_COLOR }} />}
                    <span className="text-[10px]" style={{ color: positive ? GAIN_COLOR : LOSS_COLOR }}>
                      {positive ? "+" : ""}{pctChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Insight */}
      <motion.div
        className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3 mb-5"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${CELESTE}18` }}>
          <Lightbulb className="w-4 h-4" style={{ color: CELESTE }} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed" style={nunito}>
          {t("multiplayer.insightText")}
        </p>
      </motion.div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <motion.button
          className="w-full py-4 rounded-3xl font-black text-base shadow-lg flex items-center justify-center gap-2 text-white"
          style={{ ...nunito, backgroundColor: CELESTE }}
          onClick={() => { mp.leaveRoom(); }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          <RotateCcw className="w-4 h-4" />
          {t("multiplayer.playAgain")}
        </motion.button>
        <motion.button
          className="w-full py-3 rounded-3xl bg-card font-bold text-sm border border-border flex items-center justify-center gap-2 text-foreground"
          style={nunito}
          onClick={() => navigate("/panel")}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("multiplayer.backToNest")}
        </motion.button>
      </div>

      {/* Decision history modal */}
      <AnimatePresence>
        {openPlayer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpenPlayerId(null)}
          >
            <motion.div
              className="bg-card rounded-3xl w-full max-w-sm overflow-hidden"
              style={{ maxHeight: "75vh" }}
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                <p className="text-sm font-black text-foreground" style={nunito}>
                  {openPlayer.display_name} · {t("multiplayer.decisions")}
                </p>
                <button onClick={() => setOpenPlayerId(null)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Decision list */}
              <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(75vh - 64px)" }}>
                {((openPlayer.decisions as any[]) || []).map((d: DecisionMeta, i: number) => {
                  const chfChange = d.balanceBefore && d.balanceAfter
                    ? d.balanceAfter - d.balanceBefore
                    : null;
                  const altImpact = d.decision === "hold" ? d.sellImpact : d.holdImpact;
                  const altLabel = d.decision === "hold" ? "Sell" : "Hold";
                  const recommended = d.holdImpact && d.sellImpact
                    ? (d.holdImpact >= d.sellImpact ? "Hold" : "Sell")
                    : null;
                  const isRec = recommended === (d.decision === "hold" ? "Hold" : "Sell");

                  const dotColor = d.decision === "hold" ? HOLD_COLOR : SELL_COLOR;
                  let changeColor = FLAT_COLOR;
                  let ChangeIcon = Minus;
                  if (chfChange !== null) {
                    if (chfChange > 1) { changeColor = GAIN_COLOR; ChangeIcon = TrendingUp; }
                    else if (chfChange < -1) { changeColor = LOSS_COLOR; ChangeIcon = TrendingDown; }
                  }

                  return (
                    <div key={i} className="rounded-2xl p-3 border border-border bg-background">
                      {/* Event name + decision */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }} />
                        <p className="text-xs font-bold text-foreground flex-1 truncate" style={nunito}>
                          {d.title ? t(d.title) : `#${i + 1}`}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${dotColor}20`, color: dotColor, ...nunito }}>
                          {d.decision === "hold" ? "Hold" : "Sell"}
                        </span>
                      </div>

                      {/* CHF change + recommendation */}
                      <div className="flex items-center justify-between">
                        {chfChange !== null ? (
                          <div className="flex items-center gap-1">
                            <ChangeIcon className="w-3 h-3" style={{ color: changeColor }} />
                            <span className="text-xs font-black tabular-nums" style={{ color: changeColor, ...nunito }}>
                              {chfChange >= 0 ? "+" : ""}CHF {Math.round(chfChange)}
                            </span>
                          </div>
                        ) : <span />}

                        {recommended && (
                          <span className="text-[10px] text-muted-foreground" style={nunito}>
                            {isRec ? "✓ " : ""}{t("multiplayer.recommended")}: {recommended}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MultiplayerResults;
