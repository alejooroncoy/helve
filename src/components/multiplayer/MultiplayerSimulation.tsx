import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useMonthlyPrices } from "@/hooks/useMarketData";
import { Timer, TrendingUp, TrendingDown, Users, ChevronRight } from "lucide-react";
import type { AssetClass, MarketEvent as MarketEventType } from "@/game/types";
import { ASSET_CLASSES, MARKET_EVENTS_POOL, ALL_ASSET_DB_IDS } from "@/game/types";
import type { useMultiplayer } from "@/hooks/useMultiplayer";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const INITIAL_BALANCE = 1000;
const TOTAL_MONTHS = 96; // 8 years
const STEP_INTERVAL = 700;
const EVENT_TIMER = 15;
const NUM_EVENTS = 10;

// Generate event months spread across 8 years
function generateEventMonths(total: number, count: number): number[] {
  const spacing = Math.floor(total / (count + 1));
  return Array.from({ length: count }, (_, i) => spacing * (i + 1));
}

// Pick N unique events from pool
function pickEvents(count: number): MarketEventType[] {
  const shuffled = [...MARKET_EVENTS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
}

const MultiplayerSimulation = ({ mp }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const myCategories = ((mp.myPlayer?.portfolio || []) as unknown as string[]);

  // Get all DB IDs for the selected categories
  const dbIds = useMemo(() => {
    const ids: string[] = [];
    for (const key of myCategories) {
      const cls = ASSET_CLASSES.find(c => c.key === key);
      if (cls) ids.push(...cls.dbIds);
    }
    return ids.length > 0 ? ids : ALL_ASSET_DB_IDS;
  }, [myCategories]);

  const { prices, loading: pricesLoading } = useMonthlyPrices(dbIds);

  const [currentMonth, setCurrentMonth] = useState(0);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([INITIAL_BALANCE]);
  const [paused, setPaused] = useState(false);
  const [activeEvent, setActiveEvent] = useState<MarketEventType | null>(null);
  const [eventTimer, setEventTimer] = useState(EVENT_TIMER);
  const [eventDecided, setEventDecided] = useState(false);
  const [eventsTriggered, setEventsTriggered] = useState<number[]>([]);
  const [eventHistory, setEventHistory] = useState<{ event: MarketEventType; decision: string; month: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const eventMonths = useMemo(() => generateEventMonths(TOTAL_MONTHS, NUM_EVENTS), []);
  const pickedEvents = useMemo(() => pickEvents(NUM_EVENTS), []);

  // Compute monthly multipliers
  const multipliers = useMemo(() => {
    if (!prices || Object.keys(prices).length === 0) return [];
    const mults: number[] = [];
    for (let m = 0; m < TOTAL_MONTHS; m++) {
      let totalMult = 0;
      let count = 0;
      for (const key of myCategories) {
        const cls = ASSET_CLASSES.find(c => c.key === key);
        if (!cls) continue;
        if (cls.dbIds.length > 0) {
          for (const dbId of cls.dbIds) {
            const series = prices[dbId];
            if (!series || series.length < 2) continue;
            const idx = Math.min(m, series.length - 2);
            const p0 = series[idx].price;
            const p1 = series[Math.min(idx + 1, series.length - 1)].price;
            if (p0 > 0) { totalMult += p1 / p0; count++; }
          }
        } else if (cls.syntheticMonthly) {
          const r = 1 + cls.syntheticMonthly.mean + (Math.random() - 0.5) * cls.syntheticMonthly.vol;
          totalMult += r;
          count++;
        }
      }
      mults.push(count > 0 ? totalMult / count : 1.003);
    }
    return mults;
  }, [prices, myCategories]);

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
        const eventIdx = eventMonths.indexOf(next);
        if (eventIdx >= 0 && !eventsTriggered.includes(next)) {
          setPaused(true);
          setActiveEvent(pickedEvents[eventIdx]);
          setEventTimer(EVENT_TIMER);
          setEventDecided(false);
          setEventsTriggered(prev => [...prev, next]);
        }
        return next;
      });
    }, STEP_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pricesLoading, paused, activeEvent, finished, multipliers, eventsTriggered, eventMonths, pickedEvents]);

  // Update balance
  useEffect(() => {
    if (currentMonth > 0 && multipliers[currentMonth - 1]) {
      setBalance(prev => {
        const newBal = prev * multipliers[currentMonth - 1];
        setBalanceHistory(h => [...h, newBal]);
        return newBal;
      });
    }
  }, [currentMonth, multipliers]);

  // Update balance in DB for real-time leaderboard
  useEffect(() => {
    if (currentMonth > 0 && currentMonth % 6 === 0 && mp.myPlayer) {
      mp.saveFinalScore(Math.round(balance));
    }
  }, [currentMonth]);

  // Event timer
  useEffect(() => {
    if (!activeEvent || eventDecided) return;
    timerRef.current = window.setInterval(() => {
      setEventTimer(prev => {
        if (prev <= 1) { handleEventDecision("hold"); return 0; }
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

    setEventHistory(prev => [...prev, { event: activeEvent, decision, month: currentMonth }]);
    mp.saveDecision(eventsTriggered.length - 1, decision);

    setTimeout(() => {
      setActiveEvent(null);
      setPaused(false);
      // Scroll history to end
      setTimeout(() => historyRef.current?.scrollTo({ left: historyRef.current.scrollWidth, behavior: "smooth" }), 100);
    }, 1200);
  }, [activeEvent, eventDecided, eventsTriggered, mp, currentMonth]);

  // Save final score
  useEffect(() => {
    if (finished && mp.myPlayer) {
      mp.saveFinalScore(Math.round(balance));
    }
  }, [finished]);

  const allFinished = mp.players.every(p => p.final_score !== null && p.final_score !== undefined);
  const isHost = user?.id === mp.room?.host_user_id;
  useEffect(() => { if (allFinished && isHost && finished) mp.finishGame(); }, [allFinished, isHost, finished]);

  const yearLabel = Math.floor(currentMonth / 12);
  const monthLabel = currentMonth % 12;
  const pctChange = ((balance - INITIAL_BALANCE) / INITIAL_BALANCE * 100);
  const progressPct = (currentMonth / TOTAL_MONTHS) * 100;

  // Sort players by balance for real-time leaderboard
  const sortedPlayers = useMemo(() =>
    [...mp.players].sort((a, b) => (b.balance || INITIAL_BALANCE) - (a.balance || INITIAL_BALANCE)),
    [mp.players]
  );

  if (pricesLoading) {
    return (
      <motion.div className="min-h-screen flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📊</div>
          <p className="text-sm text-muted-foreground" style={nunito}>{t("common.loading")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="min-h-screen flex flex-col px-5 py-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Header */}
      <div className="text-center mb-3">
        <h1 className="text-lg font-black text-foreground" style={nunito}>{t("multiplayer.simulation")}</h1>
        <p className="text-xs text-muted-foreground" style={nunito}>
          {t("multiplayer.year")} {yearLabel + 1} · {t("multiplayer.month")} {monthLabel + 1}
        </p>
      </div>

      {/* Progress */}
      <div className="w-full h-2 bg-muted rounded-full mb-3 overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Balance */}
      <div className="bg-card rounded-3xl p-4 shadow-lg mb-3 text-center">
        <p className="text-xs text-muted-foreground mb-1" style={nunito}>{t("multiplayer.yourBalance")}</p>
        <motion.p className="text-3xl font-black" style={{ ...nunito, color: pctChange >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
          key={Math.round(balance)} initial={{ scale: 1.1 }} animate={{ scale: 1 }}>
          CHF {Math.round(balance).toLocaleString()}
        </motion.p>
        <p className="text-xs mt-1" style={{ color: pctChange >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
          {pctChange >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
          {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
        </p>
      </div>

      {/* Mini chart */}
      <div className="bg-card rounded-2xl p-3 shadow-md mb-3">
        <svg viewBox="0 0 300 60" className="w-full h-14">
          {balanceHistory.length > 1 && (
            <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
              points={balanceHistory.map((v, i) => {
                const x = (i / Math.max(balanceHistory.length - 1, 1)) * 300;
                const min = Math.min(...balanceHistory) * 0.95;
                const max = Math.max(...balanceHistory) * 1.05;
                const y = 55 - ((v - min) / (max - min || 1)) * 45;
                return `${x},${y}`;
              }).join(" ")}
            />
          )}
        </svg>
      </div>

      {/* Event history carousel — scrolls right, newest on left */}
      {eventHistory.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] tracking-widest text-muted-foreground mb-1.5" style={{ ...nunito, fontWeight: 700 }}>
            {t("multiplayer.eventHistory")}
          </p>
          <div ref={historyRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
            {[...eventHistory].reverse().map((h, i) => (
              <motion.div
                key={`${h.event.id}-${h.month}`}
                className="flex-shrink-0 rounded-xl p-2 border"
                style={{ width: 140, scrollSnapAlign: "start",
                  backgroundColor: h.decision === "hold" ? "hsl(var(--primary) / 0.05)" : "hsl(var(--destructive) / 0.05)",
                  borderColor: h.decision === "hold" ? "hsl(var(--primary) / 0.2)" : "hsl(var(--destructive) / 0.2)",
                }}
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-[9px] font-bold text-foreground truncate" style={nunito}>{t(h.event.title)}</span>
                </div>
                <span className={`text-[9px] font-bold ${h.decision === "hold" ? "text-primary" : "text-destructive"}`} style={nunito}>
                  {h.decision === "hold" ? "💎 Hold" : "📉 Sell"} · Y{Math.floor(h.month / 12) + 1}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time leaderboard */}
      <div className="bg-card rounded-2xl p-3 shadow-md mb-3">
        <div className="flex items-center gap-1 mb-2">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground" style={nunito}>{t("multiplayer.leaderboard")}</span>
        </div>
        <AnimatePresence>
          {sortedPlayers.map((p, i) => {
            const playerPct = ((p.balance - INITIAL_BALANCE) / INITIAL_BALANCE * 100);
            return (
              <motion.div key={p.id} className="flex items-center gap-2 py-1" layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <span className="text-xs font-black w-4 text-center" style={{ ...nunito, color: i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <span className={`text-xs font-bold flex-1 truncate ${p.user_id === user?.id ? "text-primary" : "text-foreground"}`} style={nunito}>
                  {p.display_name} {p.user_id === user?.id ? `(${t("multiplayer.you")})` : ""}
                </span>
                <span className="text-xs font-bold tabular-nums" style={{ ...nunito, color: playerPct >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                  CHF {Math.round(p.balance).toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {myCategories.map(key => {
          const cls = ASSET_CLASSES.find(c => c.key === key);
          return cls ? (
            <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-muted flex items-center gap-1" style={nunito}>
              {t(`allocation.classes.${key}`)}
            </span>
          ) : null;
        })}
      </div>

      {/* Finished */}
      {finished && (
        <div className="bg-primary/10 rounded-3xl p-5 text-center">
          <p className="text-lg font-black text-primary" style={nunito}>{t("multiplayer.simFinished")}</p>
          <p className="text-xs text-muted-foreground mt-1" style={nunito}>{t("multiplayer.waitingResults")}</p>
        </div>
      )}

      {/* Event overlay */}
      <AnimatePresence>
        {activeEvent && !eventDecided && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }}>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{activeEvent.emoji}</div>
                <h2 className="text-xl font-black text-foreground" style={nunito}>{t(activeEvent.title)}</h2>
                <p className="text-sm text-muted-foreground mt-1" style={nunito}>{t(activeEvent.description)}</p>
              </div>
              <div className="flex items-center justify-center gap-2 mb-5">
                <Timer className="w-4 h-4 text-destructive" />
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{
                    width: `${(eventTimer / EVENT_TIMER) * 100}%`,
                    background: eventTimer <= 5 ? "hsl(var(--destructive))" : "hsl(var(--accent))",
                  }} />
                </div>
                <span className="text-sm font-black tabular-nums" style={{ ...nunito, color: eventTimer <= 5 ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>
                  {eventTimer}s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <motion.button className="py-3 rounded-2xl font-black text-sm bg-destructive/10 text-destructive border-2 border-destructive/30" style={nunito}
                  onClick={() => handleEventDecision("sell")} whileTap={{ scale: 0.95 }}>
                  📉 {t("multiplayer.sell")}
                </motion.button>
                <motion.button className="py-3 rounded-2xl font-black text-sm bg-primary/10 text-primary border-2 border-primary/30" style={nunito}
                  onClick={() => handleEventDecision("hold")} whileTap={{ scale: 0.95 }}>
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
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl p-6 text-center" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-bold text-foreground" style={nunito}>{t("multiplayer.decisionMade")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MultiplayerSimulation;
