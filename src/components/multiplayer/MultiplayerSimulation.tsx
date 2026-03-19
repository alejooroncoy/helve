import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useMonthlyPrices } from "@/hooks/useMarketData";
import { Timer, TrendingUp, TrendingDown, Users, AlertTriangle, Check, BarChart2, ShoppingCart, Shield, ArrowDownFromLine } from "lucide-react";
import type { MarketEvent as MarketEventType } from "@/game/types";
import { ASSET_CLASSES, MARKET_EVENTS_POOL, ALL_ASSET_DB_IDS } from "@/game/types";
import type { useMultiplayer } from "@/hooks/useMultiplayer";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const INITIAL_BALANCE = 1000;
const TOTAL_MONTHS = 36;
const MONTHS_PER_TICK = 3;          // advance 3 months per tick → visible jumps
const TOTAL_TICKS = TOTAL_MONTHS / MONTHS_PER_TICK; // 12 ticks
const CELESTE = "#5BB8F5";

const CAT_COLORS: Record<string, string> = {
  bonds:       "#60a5fa",
  equity:      "#22d3ee",
  gold:        "#fb923c",
  fx:          "#38bdf8",
  swissStocks: "#f472b6",
  usStocks:    "#818cf8",
  crypto:      "#a78bfa",
  cleanEnergy: "#2dd4bf",
};

const BTN_SELL = { bg: "#fb923c18", border: "#fb923c", color: "#fb923c" };
const BTN_HOLD = { bg: "#60a5fa18", border: "#60a5fa", color: "#60a5fa" };
const BTN_BUY  = { bg: "#a78bfa18", border: "#a78bfa", color: "#a78bfa" };

const STEP_INTERVAL = 400;
const READING_TIME = 3;
const EVENT_TIMER = 5;
const NUM_EVENTS = 5;

function generateEventTicks(totalTicks: number, count: number): number[] {
  const spacing = Math.floor(totalTicks / (count + 1));
  return Array.from({ length: count }, (_, i) => spacing * (i + 1));
}

function pickEvents(count: number): MarketEventType[] {
  return [...MARKET_EVENTS_POOL].sort(() => Math.random() - 0.5).slice(0, count);
}

interface Props { mp: ReturnType<typeof useMultiplayer>; }

const MultiplayerSimulation = ({ mp }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const myCategories = ((mp.myPlayer?.portfolio || []) as unknown as string[]);

  const dbIds = useMemo(() => {
    const ids: string[] = [];
    for (const key of myCategories) {
      const cls = ASSET_CLASSES.find(c => c.key === key);
      if (cls) ids.push(...cls.dbIds);
    }
    return ids.length > 0 ? ids : ALL_ASSET_DB_IDS;
  }, [myCategories]);

  const { prices, loading: pricesLoading } = useMonthlyPrices(dbIds);

  // Per-category monthly multipliers (real price data)
  const categoryMultipliers = useMemo(() => {
    if (!prices || Object.keys(prices).length === 0) return {} as Record<string, number[]>;
    const result: Record<string, number[]> = {};
    for (const key of myCategories) {
      const cls = ASSET_CLASSES.find(c => c.key === key);
      if (!cls) continue;
      const mults: number[] = [];
      for (let m = 0; m < TOTAL_MONTHS; m++) {
        if (cls.dbIds.length > 0) {
          let total = 0, count = 0;
          for (const dbId of cls.dbIds) {
            const series = prices[dbId];
            if (!series || series.length < 2) continue;
            const idx = Math.min(m, series.length - 2);
            const p0 = series[idx].price;
            const p1 = series[Math.min(idx + 1, series.length - 1)].price;
            if (p0 > 0) { total += p1 / p0; count++; }
          }
          mults.push(count > 0 ? total / count : 1.003);
        } else if (cls.syntheticMonthly) {
          mults.push(1 + cls.syntheticMonthly.mean + (Math.random() - 0.5) * cls.syntheticMonthly.vol);
        } else {
          mults.push(1.003);
        }
      }
      result[key] = mults;
    }
    return result;
  }, [prices, myCategories]);

  // Current tick (each tick = MONTHS_PER_TICK months)
  const [currentTick, setCurrentTick] = useState(0);

  // Each category's actual CHF allocation (starts at 1000/N each)
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, number>>({});
  // History of allocations per tick for charts
  const [categoryHistories, setCategoryHistories] = useState<Record<string, number[]>>({});

  const [paused, setPaused] = useState(false);
  const [activeEvent, setActiveEvent] = useState<MarketEventType | null>(null);
  const [eventPhase, setEventPhase] = useState<"reading" | "deciding">("reading");
  const [readingTimer, setReadingTimer] = useState(READING_TIME);
  const [eventTimer, setEventTimer] = useState(EVENT_TIMER);
  const [eventDecided, setEventDecided] = useState(false);
  const [eventsTriggered, setEventsTriggered] = useState<number[]>([]);
  const [eventHistory, setEventHistory] = useState<{ event: MarketEventType; decision: string; tick: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const readingRef = useRef<number | null>(null);

  const eventTicks = useMemo(() => generateEventTicks(TOTAL_TICKS, NUM_EVENTS), []);
  const pickedEvents = useMemo(() => pickEvents(NUM_EVENTS), []);

  // Initialize category allocations when data ready
  useEffect(() => {
    if (myCategories.length === 0 || Object.keys(categoryMultipliers).length === 0) return;
    const share = INITIAL_BALANCE / myCategories.length;
    const init: Record<string, number> = {};
    const initHist: Record<string, number[]> = {};
    for (const key of myCategories) {
      init[key] = share;
      initHist[key] = [share];
    }
    setCategoryAllocations(init);
    setCategoryHistories(initHist);
  }, [Object.keys(categoryMultipliers).join(",")]);

  // Advance simulation
  useEffect(() => {
    if (pricesLoading || paused || activeEvent || finished || Object.keys(categoryMultipliers).length === 0) return;
    intervalRef.current = window.setInterval(() => {
      setCurrentTick(prev => {
        const next = prev + 1;
        if (next >= TOTAL_TICKS) {
          clearInterval(intervalRef.current!);
          setFinished(true);
          return prev;
        }
        // Check if this tick has an event
        if (eventTicks.includes(next) && !eventsTriggered.includes(next)) {
          setPaused(true);
          const idx = eventTicks.indexOf(next);
          setActiveEvent(pickedEvents[idx]);
          setEventPhase("reading");
          setReadingTimer(READING_TIME);
          setEventTimer(EVENT_TIMER);
          setEventDecided(false);
          setEventsTriggered(e => [...e, next]);
        }
        return next;
      });
    }, STEP_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pricesLoading, paused, activeEvent, finished, categoryMultipliers, eventsTriggered, eventTicks, pickedEvents]);

  // Update category allocations each tick (compound MONTHS_PER_TICK months of real returns)
  useEffect(() => {
    if (currentTick === 0 || Object.keys(categoryMultipliers).length === 0) return;
    const monthStart = (currentTick - 1) * MONTHS_PER_TICK;
    const monthEnd = Math.min(currentTick * MONTHS_PER_TICK, TOTAL_MONTHS);

    setCategoryAllocations(prev => {
      const share = INITIAL_BALANCE / myCategories.length;
      const next: Record<string, number> = {};
      for (const key of myCategories) {
        let val = prev[key] ?? share;
        for (let m = monthStart; m < monthEnd; m++) {
          val *= categoryMultipliers[key]?.[m] ?? 1;
        }
        next[key] = val;
      }
      // Update histories inside the setter so we have the new values
      setCategoryHistories(prevH => {
        const nextH = { ...prevH };
        for (const key of myCategories) {
          nextH[key] = [...(prevH[key] ?? [share]), next[key]];
        }
        return nextH;
      });
      return next;
    });
  }, [currentTick]);

  // Total balance = sum of all category allocations
  const balance = useMemo(() => {
    const vals = Object.values(categoryAllocations);
    if (vals.length === 0) return INITIAL_BALANCE;
    return vals.reduce((s, v) => s + v, 0);
  }, [categoryAllocations]);

  // Sync balance to DB every 3 ticks
  useEffect(() => {
    if (currentTick > 0 && currentTick % 3 === 0 && mp.myPlayer) {
      mp.saveFinalScore(Math.round(balance));
    }
  }, [currentTick, balance]);

  // Phase 1: reading countdown
  useEffect(() => {
    if (!activeEvent || eventDecided || eventPhase !== "reading") return;
    readingRef.current = window.setInterval(() => {
      setReadingTimer(prev => {
        if (prev <= 1) {
          clearInterval(readingRef.current!);
          setEventPhase("deciding");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (readingRef.current) clearInterval(readingRef.current); };
  }, [activeEvent, eventDecided, eventPhase]);

  // Phase 2: decision countdown
  useEffect(() => {
    if (!activeEvent || eventDecided || eventPhase !== "deciding") return;
    timerRef.current = window.setInterval(() => {
      setEventTimer(prev => {
        if (prev <= 1) { handleEventDecision("hold"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeEvent, eventDecided, eventPhase]);

  const handleEventDecision = useCallback((decision: "sell" | "hold" | "buy") => {
    if (!activeEvent || eventDecided) return;
    setEventDecided(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (readingRef.current) clearInterval(readingRef.current);

    const rawImpact = decision === "sell"
      ? activeEvent.sellImpact
      : decision === "buy"
      ? 1 + (activeEvent.holdImpact - 1) * 1.5
      : activeEvent.holdImpact;

    // Apply impact to ALL category allocations (keeps charts consistent with balance)
    let totalBefore = 0;
    let totalAfter = 0;
    setCategoryAllocations(prev => {
      const share = INITIAL_BALANCE / myCategories.length;
      const next: Record<string, number> = {};
      for (const key of myCategories) {
        totalBefore += prev[key] ?? share;
        next[key] = (prev[key] ?? share) * rawImpact;
        totalAfter += next[key];
      }
      setCategoryHistories(prevH => {
        const nextH = { ...prevH };
        for (const key of myCategories) {
          nextH[key] = [...(prevH[key] ?? [share]), next[key]];
        }
        return nextH;
      });
      return next;
    });

    setEventHistory(prev => [...prev, { event: activeEvent, decision, tick: currentTick }]);
    // Save decision meta (approximate balances)
    mp.saveDecision(eventsTriggered.length - 1, decision, {
      title: activeEvent.title,
      holdImpact: activeEvent.holdImpact,
      sellImpact: activeEvent.sellImpact,
      balanceBefore: Math.round(balance),
      balanceAfter: Math.round(balance * rawImpact),
    });

    setTimeout(() => {
      setActiveEvent(null);
      setPaused(false);
    }, 1200);
  }, [activeEvent, eventDecided, eventsTriggered, mp, currentTick, balance, myCategories]);

  // Save final score when done
  useEffect(() => {
    if (finished && mp.myPlayer) {
      mp.saveFinalScore(Math.round(balance));
    }
  }, [finished, balance]);

  const allFinished = mp.players.every(p => p.final_score !== null && p.final_score !== undefined);
  const isHost = user?.id === mp.room?.host_user_id;
  useEffect(() => { if (allFinished && isHost && finished) mp.finishGame(); }, [allFinished, isHost, finished]);

  const currentMonth = currentTick * MONTHS_PER_TICK;
  const yearLabel = Math.floor(currentMonth / 12) + 1;
  const monthLabel = (currentMonth % 12) + 1;
  const pctChange = ((balance - INITIAL_BALANCE) / INITIAL_BALANCE * 100);
  const progressPct = (currentTick / TOTAL_TICKS) * 100;
  const sharePerCat = INITIAL_BALANCE / Math.max(myCategories.length, 1);

  const sortedPlayers = useMemo(() =>
    [...mp.players].sort((a, b) => (b.balance || INITIAL_BALANCE) - (a.balance || INITIAL_BALANCE)),
    [mp.players]
  );

  if (pricesLoading) {
    return (
      <motion.div className="min-h-screen flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 animate-pulse" style={{ color: CELESTE }} />
          <p className="text-sm text-muted-foreground" style={nunito}>{t("common.loading")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="min-h-screen flex flex-col px-5 py-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

      {/* Language switcher */}
      <div className="flex justify-center mb-3">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <div className="text-center mb-3">
        <h1 className="text-lg font-black text-foreground" style={nunito}>{t("multiplayer.simulation")}</h1>
        <p className="text-xs text-muted-foreground" style={nunito}>
          {t("multiplayer.year")} {yearLabel} · {t("multiplayer.month")} {monthLabel}
        </p>
      </div>

      {/* Progress */}
      <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
        <motion.div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: CELESTE }} transition={{ duration: 0.3 }} />
      </div>

      {/* Balance */}
      <div className="bg-card rounded-3xl p-4 shadow-lg mb-3 text-center">
        <p className="text-xs text-muted-foreground mb-1" style={nunito}>{t("multiplayer.yourBalance")}</p>
        <motion.p className="text-3xl font-black" style={{ ...nunito, color: CELESTE }}
          key={Math.round(balance)} initial={{ scale: 1.05 }} animate={{ scale: 1 }}>
          CHF {Math.round(balance).toLocaleString()}
        </motion.p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {pctChange >= 0.5
            ? <TrendingUp className="w-3 h-3" style={{ color: CELESTE }} />
            : pctChange < -0.5
            ? <TrendingDown className="w-3 h-3" style={{ color: "#94a3b8" }} />
            : null}
          <span className="text-xs font-bold" style={{ ...nunito, color: Math.abs(pctChange) < 0.5 ? "#94a3b8" : pctChange >= 0 ? CELESTE : "#94a3b8" }}>
            {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Per-category charts — stacked, consistent with balance */}
      <div className="bg-card rounded-2xl p-3 shadow-md mb-3 space-y-3">
        {myCategories.map(key => {
          const hist = categoryHistories[key] ?? [sharePerCat];
          const color = CAT_COLORS[key] ?? CELESTE;
          const last = hist[hist.length - 1] ?? sharePerCat;
          const pct = ((last - sharePerCat) / sharePerCat * 100);

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-foreground" style={nunito}>
                  {t(`allocation.classes.${key}`)}
                </span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color, ...nunito }}>
                  CHF {Math.round(last).toLocaleString()} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                </span>
              </div>
              {hist.length >= 2 ? (() => {
                const min = Math.min(...hist) * 0.97;
                const max = Math.max(...hist) * 1.03;
                const range = max - min || 1;
                const toY = (v: number) => 38 - ((v - min) / range) * 32;
                const points = hist.map((v, i) =>
                  `${(i / Math.max(hist.length - 1, 1)) * 300},${toY(v)}`
                ).join(" ");
                return (
                  <svg viewBox="0 0 300 42" className="w-full h-10">
                    <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={points} />
                  </svg>
                );
              })() : (
                <div className="h-10 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground" style={nunito}>—</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-time leaderboard */}
      <div className="bg-card rounded-2xl p-3 shadow-md mb-3">
        <div className="flex items-center gap-1 mb-2">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground" style={nunito}>{t("multiplayer.leaderboard")}</span>
        </div>
        {sortedPlayers.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 py-1">
            <span className="text-xs font-black w-4 text-center text-muted-foreground" style={nunito}>{i + 1}</span>
            <span className="text-xs font-bold flex-1 truncate" style={{ ...nunito, color: p.user_id === user?.id ? CELESTE : "hsl(var(--foreground))" }}>
              {p.display_name} {p.user_id === user?.id ? `(${t("multiplayer.you")})` : ""}
            </span>
            <span className="text-xs font-bold tabular-nums" style={{ ...nunito, color: CELESTE }}>
              CHF {Math.round(p.balance || INITIAL_BALANCE).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Event history */}
      {eventHistory.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] tracking-widest text-muted-foreground mb-1.5" style={{ ...nunito, fontWeight: 700 }}>
            {t("multiplayer.eventHistory")}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...eventHistory].reverse().map((h, i) => {
              const s = h.decision === "sell" ? BTN_SELL : h.decision === "buy" ? BTN_BUY : BTN_HOLD;
              return (
                <div key={`${h.event.id}-${h.tick}`} className="flex-shrink-0 rounded-xl p-2 border"
                  style={{ width: 130, backgroundColor: s.bg, borderColor: s.border }}>
                  <span className="text-[9px] font-bold text-foreground block truncate" style={nunito}>{t(h.event.title)}</span>
                  <span className="text-[9px] font-bold mt-0.5 block" style={{ ...nunito, color: s.color }}>
                    {h.decision.charAt(0).toUpperCase() + h.decision.slice(1)} · Y{Math.ceil(h.tick * MONTHS_PER_TICK / 12)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finished */}
      {finished && (
        <div className="rounded-3xl p-5 text-center" style={{ backgroundColor: `${CELESTE}12`, border: `2px solid ${CELESTE}40` }}>
          <p className="text-lg font-black" style={{ ...nunito, color: CELESTE }}>{t("multiplayer.simFinished")}</p>
          <p className="text-xs text-muted-foreground mt-1" style={nunito}>{t("multiplayer.waitingResults")}</p>
        </div>
      )}

      {/* Event overlay */}
      <AnimatePresence>
        {activeEvent && !eventDecided && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}>

              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: `${CELESTE}18` }}>
                  <AlertTriangle className="w-6 h-6" style={{ color: CELESTE }} />
                </div>
                <h2 className="text-xl font-black text-foreground mb-1" style={nunito}>{t(activeEvent.title)}</h2>
                <p className="text-sm text-muted-foreground" style={nunito}>{t(activeEvent.description)}</p>
              </div>

              {/* Phase 1: reading */}
              {eventPhase === "reading" && (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-2" style={nunito}>{readingTimer}s</p>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ width: `${(readingTimer / READING_TIME) * 100}%`, backgroundColor: CELESTE }} />
                  </div>
                </div>
              )}

              {/* Phase 2: deciding */}
              {eventPhase === "deciding" && (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <Timer className="w-4 h-4 flex-shrink-0" style={{ color: CELESTE }} />
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ width: `${(eventTimer / EVENT_TIMER) * 100}%`, backgroundColor: CELESTE }} />
                    </div>
                    <span className="text-sm font-black tabular-nums w-6 text-right" style={{ ...nunito, color: CELESTE }}>
                      {eventTimer}s
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.button className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2"
                      style={{ ...nunito, backgroundColor: BTN_SELL.bg, borderColor: BTN_SELL.border, color: BTN_SELL.color }}
                      onClick={() => handleEventDecision("sell")} whileTap={{ scale: 0.97 }}>
                      <ArrowDownFromLine className="w-4 h-4" />
                      {t("multiplayer.sell")}
                    </motion.button>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button className="py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2"
                        style={{ ...nunito, backgroundColor: BTN_HOLD.bg, borderColor: BTN_HOLD.border, color: BTN_HOLD.color }}
                        onClick={() => handleEventDecision("hold")} whileTap={{ scale: 0.97 }}>
                        <Shield className="w-4 h-4" />
                        {t("multiplayer.hold")}
                      </motion.button>
                      <motion.button className="py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2"
                        style={{ ...nunito, backgroundColor: BTN_BUY.bg, borderColor: BTN_BUY.border, color: BTN_BUY.color }}
                        onClick={() => handleEventDecision("buy")} whileTap={{ scale: 0.97 }}>
                        <ShoppingCart className="w-4 h-4" />
                        {t("multiplayer.buy")}
                      </motion.button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision feedback */}
      <AnimatePresence>
        {activeEvent && eventDecided && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl p-6 text-center" initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: `${CELESTE}20` }}>
                <Check className="w-5 h-5" style={{ color: CELESTE }} />
              </div>
              <p className="text-sm font-bold text-foreground" style={nunito}>{t("multiplayer.decisionMade")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MultiplayerSimulation;
