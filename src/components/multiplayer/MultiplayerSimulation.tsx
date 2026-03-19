import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useMonthlyPrices } from "@/hooks/useMarketData";
import { Timer, TrendingUp, TrendingDown, AlertTriangle, Users } from "lucide-react";
import type { Investment } from "@/game/types";
import type { useMultiplayer } from "@/hooks/useMultiplayer";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const INITIAL_BALANCE = 1000;
const TOTAL_MONTHS = 120; // 10 years
const STEP_INTERVAL = 800; // ms per month step
const EVENT_TIMER = 15; // seconds to decide
const EVENT_MONTHS = [30, 60, 90]; // Events at ~2.5yr, 5yr, 7.5yr

const investmentToDbId: Record<string, string> = {
  "ch-bond-aaa": "ch-bond-aaa", "global-bond": "global-bond-agg", "ch-govt-10y": "ch-govt-10y",
  "smi-index": "smi-index", "eurostoxx50": "eurostoxx50", "gold-chf": "gold-chf",
  "nestle": "nesn-ch", "novartis": "novn-ch", "green-energy": "green-energy",
  "djia-index": "djia-index", "dax-index": "dax-index",
  "apple": "aapl-us", "microsoft": "msft-us", "nvidia": "nvda-us",
  "logitech": "logn-ch", "ubs": "ubsg-ch", "amazon": "amzn-us",
};

interface MarketProblem {
  title: string;
  description: string;
  emoji: string;
  sellImpact: number; // multiplier if sell
  holdImpact: number; // multiplier if hold
}

const PROBLEMS: MarketProblem[] = [
  { title: "Market Crash", description: "Markets drop 20%. Sell your riskiest asset or hold?", emoji: "📉", sellImpact: 0.9, holdImpact: 0.8 },
  { title: "Interest Rate Hike", description: "Central banks raise rates. Bonds suffer, stocks volatile.", emoji: "🏦", sellImpact: 0.95, holdImpact: 0.88 },
  { title: "Tech Bubble Burst", description: "Tech stocks plummet 30%. Diversified portfolios safer.", emoji: "💥", sellImpact: 0.92, holdImpact: 0.75 },
  { title: "Pandemic Shock", description: "Global pandemic. Markets freeze. Stay calm or panic sell?", emoji: "🦠", sellImpact: 0.88, holdImpact: 0.7 },
  { title: "Currency Crisis", description: "Your base currency weakens 15%. Foreign assets gain.", emoji: "💱", sellImpact: 0.93, holdImpact: 0.85 },
  { title: "Commodity Boom", description: "Oil & gold surge. Good if diversified, bad if all-in stocks.", emoji: "🛢️", sellImpact: 0.96, holdImpact: 1.1 },
];

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const MultiplayerSimulation = ({ mp }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const myPortfolio = (mp.myPlayer?.portfolio || []) as Investment[];

  const dbIds = useMemo(() => myPortfolio.map(a => investmentToDbId[a.id] || a.id), [myPortfolio]);
  const { prices, loading: pricesLoading } = useMonthlyPrices(dbIds);

  const [currentMonth, setCurrentMonth] = useState(0);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([INITIAL_BALANCE]);
  const [paused, setPaused] = useState(false);
  const [activeEvent, setActiveEvent] = useState<MarketProblem | null>(null);
  const [eventTimer, setEventTimer] = useState(EVENT_TIMER);
  const [eventDecided, setEventDecided] = useState(false);
  const [eventsTriggered, setEventsTriggered] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Compute monthly multipliers from real data
  const multipliers = useMemo(() => {
    if (!prices || Object.keys(prices).length === 0) return [];
    const mults: number[] = [];
    for (let m = 0; m < TOTAL_MONTHS; m++) {
      let totalMult = 0;
      let count = 0;
      for (const inv of myPortfolio) {
        const dbId = investmentToDbId[inv.id] || inv.id;
        const series = prices[dbId];
        if (!series || series.length < 2) continue;
        const idx = Math.min(m, series.length - 2);
        const p0 = series[idx].price;
        const p1 = series[Math.min(idx + 1, series.length - 1)].price;
        if (p0 > 0) { totalMult += p1 / p0; count++; }
      }
      mults.push(count > 0 ? totalMult / count : 1.005);
    }
    return mults;
  }, [prices, myPortfolio]);

  // Advance simulation
  useEffect(() => {
    if (pricesLoading || paused || activeEvent || finished || multipliers.length === 0) return;
    intervalRef.current = window.setInterval(() => {
      setCurrentMonth(prev => {
        const next = prev + 1;
        if (next >= TOTAL_MONTHS) {
          clearInterval(intervalRef.current!);
          setFinished(true);
          return prev;
        }
        // Check for event
        if (EVENT_MONTHS.includes(next) && !eventsTriggered.includes(next)) {
          setPaused(true);
          const problem = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
          setActiveEvent(problem);
          setEventTimer(EVENT_TIMER);
          setEventDecided(false);
          setEventsTriggered(prev => [...prev, next]);
        }
        return next;
      });
    }, STEP_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pricesLoading, paused, activeEvent, finished, multipliers, eventsTriggered]);

  // Update balance when month changes
  useEffect(() => {
    if (currentMonth > 0 && multipliers[currentMonth - 1]) {
      setBalance(prev => {
        const newBal = prev * multipliers[currentMonth - 1];
        setBalanceHistory(h => [...h, newBal]);
        return newBal;
      });
    }
  }, [currentMonth, multipliers]);

  // Event countdown timer
  useEffect(() => {
    if (!activeEvent || eventDecided) return;
    timerRef.current = window.setInterval(() => {
      setEventTimer(prev => {
        if (prev <= 1) {
          // Auto-hold if no decision
          handleEventDecision("hold");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeEvent, eventDecided]);

  const handleEventDecision = useCallback((decision: "sell" | "hold") => {
    if (!activeEvent || eventDecided) return;
    setEventDecided(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const impact = decision === "sell" ? activeEvent.sellImpact : activeEvent.holdImpact;
    setBalance(prev => {
      const newBal = prev * impact;
      setBalanceHistory(h => [...h.slice(0, -1), newBal]);
      return newBal;
    });

    mp.saveDecision(eventsTriggered.length - 1, decision);

    setTimeout(() => {
      setActiveEvent(null);
      setPaused(false);
    }, 1500);
  }, [activeEvent, eventDecided, eventsTriggered, mp]);

  // Save final score when finished
  useEffect(() => {
    if (finished && mp.myPlayer) {
      mp.saveFinalScore(Math.round(balance));
    }
  }, [finished]);

  // Check if all players finished
  const allFinished = mp.players.every(p => p.final_score !== null && p.final_score !== undefined);
  const isHost = user?.id === mp.room?.host_user_id;

  useEffect(() => {
    if (allFinished && isHost) {
      mp.finishGame();
    }
  }, [allFinished, isHost]);

  const yearLabel = Math.floor(currentMonth / 12);
  const monthLabel = currentMonth % 12;
  const pctChange = ((balance - INITIAL_BALANCE) / INITIAL_BALANCE * 100);
  const progressPct = (currentMonth / TOTAL_MONTHS) * 100;

  if (pricesLoading) {
    return (
      <motion.div className="min-h-screen flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📊</div>
          <p className="text-sm text-muted-foreground" style={nunito}>{t("common.loading")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col px-5 py-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-black text-foreground" style={nunito}>
          {t("multiplayer.simulation")}
        </h1>
        <p className="text-xs text-muted-foreground" style={nunito}>
          {t("multiplayer.year")} {yearLabel + 1} · {t("multiplayer.month")} {monthLabel + 1}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          style={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Balance card */}
      <div className="bg-card rounded-3xl p-5 shadow-lg mb-4 text-center">
        <p className="text-xs text-muted-foreground mb-1" style={nunito}>{t("multiplayer.yourBalance")}</p>
        <motion.p
          className="text-3xl font-black"
          style={{ ...nunito, color: pctChange >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
          key={Math.round(balance)}
          initial={{ scale: 1.1 }} animate={{ scale: 1 }}
        >
          CHF {Math.round(balance).toLocaleString()}
        </motion.p>
        <p className="text-xs mt-1" style={{ color: pctChange >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
          {pctChange >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
          {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
        </p>
      </div>

      {/* Mini chart */}
      <div className="bg-card rounded-3xl p-4 shadow-md mb-4">
        <svg viewBox={`0 0 300 80`} className="w-full h-20">
          {balanceHistory.length > 1 && (
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              points={balanceHistory.map((v, i) => {
                const x = (i / Math.max(balanceHistory.length - 1, 1)) * 300;
                const min = Math.min(...balanceHistory) * 0.95;
                const max = Math.max(...balanceHistory) * 1.05;
                const y = 80 - ((v - min) / (max - min || 1)) * 70 - 5;
                return `${x},${y}`;
              }).join(" ")}
            />
          )}
        </svg>
      </div>

      {/* Portfolio */}
      <div className="bg-card rounded-3xl p-4 shadow-md mb-4">
        <p className="text-xs text-muted-foreground mb-2" style={nunito}>{t("multiplayer.yourNest")}</p>
        <div className="flex flex-wrap gap-2">
          {myPortfolio.map(inv => (
            <span key={inv.id} className="text-xs px-2 py-1 rounded-full bg-muted flex items-center gap-1" style={nunito}>
              {inv.emoji} {inv.name.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Other players */}
      <div className="bg-card rounded-3xl p-4 shadow-md mb-4">
        <div className="flex items-center gap-1 mb-2">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground" style={nunito}>{t("multiplayer.leaderboard")}</span>
        </div>
        {mp.players
          .sort((a, b) => (b.balance || INITIAL_BALANCE) - (a.balance || INITIAL_BALANCE))
          .map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 py-1">
              <span className="text-xs font-bold w-4" style={{ ...nunito, color: i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>
                {i + 1}
              </span>
              <span className={`text-xs font-bold flex-1 ${p.user_id === user?.id ? "text-primary" : "text-foreground"}`} style={nunito}>
                {p.display_name} {p.user_id === user?.id ? "(you)" : ""}
              </span>
              <span className="text-xs font-bold text-muted-foreground" style={nunito}>
                {p.final_score ? `CHF ${p.final_score.toLocaleString()}` : "..."}
              </span>
            </div>
          ))}
      </div>

      {/* Finished state */}
      {finished && (
        <div className="bg-primary/10 rounded-3xl p-5 text-center">
          <p className="text-lg font-black text-primary" style={nunito}>
            {t("multiplayer.simFinished")}
          </p>
          <p className="text-xs text-muted-foreground mt-1" style={nunito}>
            {t("multiplayer.waitingResults")}
          </p>
        </div>
      )}

      {/* Event overlay */}
      <AnimatePresence>
        {activeEvent && !eventDecided && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }}
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{activeEvent.emoji}</div>
                <h2 className="text-xl font-black text-foreground" style={nunito}>
                  {activeEvent.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1" style={nunito}>
                  {activeEvent.description}
                </p>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <Timer className="w-4 h-4 text-destructive" />
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${(eventTimer / EVENT_TIMER) * 100}%`,
                      background: eventTimer <= 5 ? "hsl(var(--destructive))" : "hsl(var(--accent))",
                    }}
                  />
                </div>
                <span className="text-sm font-black tabular-nums" style={{
                  ...nunito,
                  color: eventTimer <= 5 ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                }}>
                  {eventTimer}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  className="py-3 rounded-2xl font-black text-sm bg-destructive/10 text-destructive border-2 border-destructive/30"
                  style={nunito}
                  onClick={() => handleEventDecision("sell")}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                >
                  📉 {t("multiplayer.sell")}
                </motion.button>
                <motion.button
                  className="py-3 rounded-2xl font-black text-sm bg-primary/10 text-primary border-2 border-primary/30"
                  style={nunito}
                  onClick={() => handleEventDecision("hold")}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                >
                  💎 {t("multiplayer.hold")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision feedback */}
      <AnimatePresence>
        {activeEvent && eventDecided && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-3xl p-6 text-center"
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            >
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-bold text-foreground" style={nunito}>
                {t("multiplayer.decisionMade")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MultiplayerSimulation;
