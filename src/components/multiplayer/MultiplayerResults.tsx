import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, ArrowLeft, Lightbulb, X, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
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

const HOLD_COLOR  = "#60a5fa";
const SELL_COLOR  = "#fb923c";
const GAIN_COLOR  = "#60a5fa";
const LOSS_COLOR  = "#fb923c";
const FLAT_COLOR  = "#94a3b8";

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
  const [openMyDecisions, setOpenMyDecisions] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const ranked = useMemo(() =>
    [...mp.players]
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .map((p, i) => ({ ...p, rank: i + 1 })),
    [mp.players]
  );

  const winner = ranked[0];
  const myPlayer = ranked.find(p => p.user_id === user?.id);
  const myDecisions: DecisionMeta[] = (myPlayer?.decisions as any[]) || [];

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

      {/* Rankings */}
      <div className="flex-1 flex flex-col gap-3 mb-5">
        {ranked.map((p, i) => {
          const isMe = p.user_id === user?.id;
          const finalScore = p.final_score || INITIAL;
          const pctChange = (finalScore - INITIAL) / INITIAL * 100;
          const positive = pctChange > 0.5;
          const negative = pctChange < -0.5;

          return (
            <motion.div
              key={p.id}
              className="rounded-3xl p-4 shadow-sm"
              style={{
                background: isMe ? `${CELESTE}12` : "hsl(var(--card))",
                border: `2px solid ${isMe ? CELESTE : "hsl(var(--border))"}`,
                cursor: isMe && myDecisions.length > 0 ? "pointer" : "default",
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              onClick={() => isMe && myDecisions.length > 0 && setOpenMyDecisions(true)}
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
                  <p className="text-[10px] text-muted-foreground mt-0.5" style={nunito}>
                    CHF {INITIAL.toLocaleString()} → CHF {Math.round(finalScore).toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {positive
                      ? <TrendingUp className="w-3 h-3" style={{ color: GAIN_COLOR }} />
                      : negative
                      ? <TrendingDown className="w-3 h-3" style={{ color: LOSS_COLOR }} />
                      : <Minus className="w-3 h-3" style={{ color: FLAT_COLOR }} />}
                    <span className="text-sm font-black tabular-nums" style={{
                      ...nunito,
                      color: positive ? GAIN_COLOR : negative ? LOSS_COLOR : FLAT_COLOR,
                    }}>
                      {positive ? "+" : ""}{pctChange.toFixed(1)}%
                    </span>
                  </div>
                  {isMe && myDecisions.length > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action */}
      <div className="flex flex-col gap-3">
        <motion.button
          className="w-full py-4 rounded-3xl font-black text-base shadow-lg flex items-center justify-center gap-2 text-white"
          style={{ ...nunito, backgroundColor: CELESTE }}
          onClick={() => { mp.leaveRoom(); navigate("/panel"); }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("multiplayer.backToNest")}
        </motion.button>
      </div>

      {/* Floating insight button */}
      <motion.button
        className="fixed bottom-24 right-5 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-40"
        style={{ backgroundColor: CELESTE }}
        onClick={() => setShowInsight(true)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", bounce: 0.5 }}
      >
        <Lightbulb className="w-5 h-5 text-white" />
      </motion.button>

      {/* Insight popup */}
      <AnimatePresence>
        {showInsight && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowInsight(false)}
          >
            <motion.div
              className="bg-card rounded-3xl w-full max-w-sm p-5 shadow-xl"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${CELESTE}18` }}>
                  <Lightbulb className="w-4 h-4" style={{ color: CELESTE }} />
                </div>
                <p className="text-sm font-black text-foreground" style={nunito}>
                  {t("multiplayer.insight")}
                </p>
                <button className="ml-auto" onClick={() => setShowInsight(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" style={nunito}>
                {t("multiplayer.insightText")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My decision history modal */}
      <AnimatePresence>
        {openMyDecisions && myPlayer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpenMyDecisions(false)}
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
                  {myPlayer.display_name} · {t("multiplayer.decisions")}
                </p>
                <button onClick={() => setOpenMyDecisions(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Decision list */}
              <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(75vh - 64px)" }}>
                {myDecisions.map((d: DecisionMeta, i: number) => {
                  const chfChange = d.balanceBefore && d.balanceAfter
                    ? d.balanceAfter - d.balanceBefore
                    : null;
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
