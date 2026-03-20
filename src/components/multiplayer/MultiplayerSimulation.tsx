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
const MONTHS_PER_TICK = 1;
const TOTAL_TICKS = TOTAL_MONTHS / MONTHS_PER_TICK;
const CELESTE = "#5BB8F5";
const BUY_AMOUNT = 100; // fixed CHF invested on Buy

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

// Event button semantic colors (Sell=red, Hold=green, Buy=yellow)
const BTN_SELL = { bg: "#ef444415", border: "#ef4444", color: "#ef4444" };
const BTN_HOLD = { bg: "#22c55e15", border: "#22c55e", color: "#22c55e" };
const BTN_BUY  = { bg: "#eab30815", border: "#eab308", color: "#eab308" };

// History chips colors (neutral)
const CHIP_SELL = { bg: "#fb923c18", border: "#fb923c", color: "#fb923c" };
const CHIP_HOLD = { bg: "#60a5fa18", border: "#60a5fa", color: "#60a5fa" };
const CHIP_BUY  = { bg: "#a78bfa18", border: "#a78bfa", color: "#a78bfa" };

const STEP_INTERVAL = 1100;
const READING_TIME = 2;
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

  const [currentTick, setCurrentTick] = useState(0);
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, number>>({});
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

  useEffect(() => {
    if (myCategories.length === 0 || Object.keys(categoryMultipliers).length === 0) return;
    const share = INITIAL_BALANCE / myCategories.length;
    const init: Record<string, number> = {};
    const initHist: Record<string, number[]> = {};
    for (const key of myCategories) { init[key] = share; initHist[key] = [share]; }
    setCategoryAllocations(init);
    setCategoryHistories(initHist);
  }, [Object.keys(categoryMultipliers).join(",")]);

  useEffect(() => {
    if (pricesLoading || paused || activeEvent || finished || Object.keys(categoryMultipliers).length === 0) return;
    intervalRef.current = window.setInterval(() => {
      setCurrentTick(prev => {
        const next = prev + 1;
        if (next >= TOTAL_TICKS) { clearInterval(intervalRef.current!); setFinished(true); return prev; }
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

  useEffect(() => {
    if (currentTick === 0 || Object.keys(categoryMultipliers).length === 0) return;
    const monthStart = (currentTick - 1) * MONTHS_PER_TICK;
    const monthEnd = Math.min(currentTick * MONTHS_PER_TICK, TOTAL_MONTHS);
    setCategoryAllocations(prev => {
      const share = INITIAL_BALANCE / myCategories.length;
      const next: Record<string, number> = {};
      for (const key of myCategories) {
        let val = prev[key] ?? share;
        for (let m = monthStart; m < monthEnd; m++) val *= categoryMultipliers[key]?.[m] ?? 1;
        next[key] = val;
      }
      setCategoryHistories(prevH => {
        const nextH = { ...prevH };
        for (const key of myCategories) nextH[key] = [...(prevH[key] ?? [share]), next[key]];
        return nextH;
      });
      return next;
    });
  }, [currentTick]);

  const balance = useMemo(() => {
    const vals = Object.values(categoryAllocations);
    return vals.length === 0 ? INITIAL_BALANCE : vals.reduce((s, v) => s + v, 0);
  }, [categoryAllocations]);

  useEffect(() => {
    if (currentTick > 0 && currentTick % 3 === 0 && mp.myPlayer) mp.saveFinalScore(Math.round(balance));
  }, [currentTick, balance]);

  useEffect(() => {
    if (!activeEvent || eventDecided || eventPhase !== "reading") return;
    readingRef.current = window.setInterval(() => {
      setReadingTimer(prev => {
        if (prev <= 1) { clearInterval(readingRef.current!); setEventPhase("deciding"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (readingRef.current) clearInterval(readingRef.current); };
  }, [activeEvent, eventDecided, eventPhase]);

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

    const holdImpact = activeEvent.holdImpact;
    const sellImpact = activeEvent.sellImpact;

    let balanceBefore = 0;
    let balanceAfter = 0;

    setCategoryAllocations(prev => {
      const share = INITIAL_BALANCE / myCategories.length;
      const extraPerCat = decision === "buy" ? BUY_AMOUNT / myCategories.length : 0;
      const impact = decision === "sell" ? sellImpact : holdImpact;
      const next: Record<string, number> = {};
      for (const key of myCategories) {
        const base = prev[key] ?? share;
        balanceBefore += base;
        next[key] = (base + extraPerCat) * impact - extraPerCat;
        balanceAfter += next[key];
      }
      setCategoryHistories(prevH => {
        const nextH = { ...prevH };
        for (const key of myCategories) nextH[key] = [...(prevH[key] ?? [share]), next[key]];
        return nextH;
      });
      return next;
    });

    setEventHistory(prev => [...prev, { event: activeEvent, decision, tick: currentTick }]);
    mp.saveDecision(eventsTriggered.length - 1, decision, {
      title: activeEvent.title,
      holdImpact,
      sellImpact,
      balanceBefore: Math.round(balance),
      balanceAfter: Math.round(decision === "buy"
        ? (balance + BUY_AMOUNT) * holdImpact - BUY_AMOUNT
        : balance * (decision === "sell" ? sellImpact : holdImpact)),
    });

    setTimeout(() => { setActiveEvent(null); setPaused(false); }, 1200);
  }, [activeEvent, eventDecided, eventsTriggered, mp, currentTick, balance, myCategories]);

  useEffect(() => {
    if (finished && mp.myPlayer) mp.saveFinalScore(Math.round(balance));
  }, [finished, balance]);

  const allFinished = mp.players.every(p => p.final_score !== null && p.final_score !== undefined);
  const isHost = user?.id === mp.room?.host_user_id;
  useEffect(() => { if (allFinished && isHost && finished) mp.finishGame(); }, [allFinished, isHost, finished]);

  const currentMonth = currentTick * MONTHS_PER_TICK;
  const yearLabel = Math.floor(currentMonth / 12) + 1;
  const monthLabel = (currentMonth % 12) + 1;
  const pctChange = ((balance - INITIAL_BALANCE) / INITIAL_BALANCE * 100);
  const sharePerCat = INITIAL_BALANCE / Math.max(myCategories.length, 1);
  const eventActive = !!activeEvent && !eventDecided;

  // Segmented progress: NUM_EVENTS+1 chapters separated by event dots
  const chapters = [0, ...eventTicks, TOTAL_TICKS];

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
    <motion.div className="min-h-screen flex flex-col px-5 py-4 pb-32"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

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

      {/* Segmented progress bar with event dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {chapters.slice(0, -1).map((start, i) => {
          const end = chapters[i + 1];
          const segProg = Math.max(0, Math.min(1, (currentTick - start) / (end - start)));
          const eventDotTick = eventTicks[i];
          const dotTriggered = eventDotTick ? eventsTriggered.includes(eventDotTick) : false;
          return (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              {/* Segment bar */}
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                <motion.div className="h-full rounded-full" style={{ width: `${segProg * 100}%`, backgroundColor: CELESTE }} transition={{ duration: 0.3 }} />
              </div>
              {/* Event dot (after each segment except last) */}
              {i < NUM_EVENTS && (
                <div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors"
                  style={{
                    backgroundColor: dotTriggered ? CELESTE : "hsl(var(--background))",
                    borderColor: dotTriggered ? CELESTE : "hsl(var(--muted-foreground))",
                  }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Balance card — flips to show event info during reading phase */}
      <div style={{ perspective: "900px" }} className="mb-4">
        <AnimatePresence mode="wait">
          {eventActive ? (
            <motion.div key="event-card"
              className="bg-card rounded-3xl p-5 shadow-xl text-center"
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: 90, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ transformOrigin: "top center" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${CELESTE}18` }}>
                <AlertTriangle className="w-5 h-5" style={{ color: CELESTE }} />
              </div>
              <h2 className="text-lg font-black text-foreground mb-1" style={nunito}>{t(activeEvent!.title)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed" style={nunito}>{t(activeEvent!.description)}</p>

              {/* Affected asset class chips */}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {(activeEvent!.affectedClasses ?? []).map((cls: string) => {
                  const isMine = myCategories.includes(cls);
                  const color = CAT_COLORS[cls] ?? CELESTE;
                  return (
                    <span key={cls}
                      className="text-[10px] font-black px-2.5 py-1 rounded-full border"
                      style={{
                        backgroundColor: isMine ? `${color}20` : "hsl(var(--muted) / 0.4)",
                        borderColor: isMine ? color : "hsl(var(--border))",
                        color: isMine ? color : "hsl(var(--muted-foreground))",
                        ...nunito,
                      }}>
                      {isMine ? "● " : ""}{t(`allocation.classes.${cls}`)}
                    </span>
                  );
                })}
              </div>
              {(activeEvent!.affectedClasses ?? []).some((cls: string) => myCategories.includes(cls)) && (
                <p className="text-[10px] font-bold mt-2" style={{ ...nunito, color: CELESTE }}>
                  {t("multiplayer.affectsYourPortfolio")}
                </p>
              )}

              {/* Reading countdown — only shown during reading phase */}
              {eventPhase === "reading" && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex-1 max-w-[160px] h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                    <motion.div className="h-full rounded-full" style={{ width: `${(readingTimer / READING_TIME) * 100}%`, backgroundColor: CELESTE }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ ...nunito, color: CELESTE }}>{readingTimer}s</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="balance-card"
              className="bg-card rounded-3xl p-4 shadow-lg text-center"
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ transformOrigin: "top center" }}>
              <p className="text-xs text-muted-foreground mb-1" style={nunito}>{t("multiplayer.yourBalance")}</p>
              <motion.p className="text-3xl font-black" style={{ ...nunito, color: CELESTE }}
                key={Math.round(balance)} initial={{ scale: 1.05 }} animate={{ scale: 1 }}>
                CHF {Math.round(balance).toLocaleString()}
              </motion.p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {pctChange >= 0.5 ? <TrendingUp className="w-3 h-3" style={{ color: CELESTE }} />
                  : pctChange < -0.5 ? <TrendingDown className="w-3 h-3" style={{ color: "#94a3b8" }} />
                  : null}
                <span className="text-xs font-bold" style={{ ...nunito, color: Math.abs(pctChange) < 0.5 ? "#94a3b8" : pctChange >= 0 ? CELESTE : "#94a3b8" }}>
                  {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rest of content — dims when event is deciding */}
      <div style={{
        opacity: eventActive ? 0.25 : 1,
        pointerEvents: eventActive ? "none" : "auto",
        transition: "opacity 0.4s ease",
      }}>
        {/* Per-category charts */}
        <div className="bg-card rounded-2xl p-4 shadow-md mb-4 space-y-5">
          {myCategories.map(key => {
            const hist = categoryHistories[key] ?? [sharePerCat];
            const color = CAT_COLORS[key] ?? CELESTE;
            const last = hist[hist.length - 1] ?? sharePerCat;
            const pct = ((last - sharePerCat) / sharePerCat * 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-foreground" style={nunito}>{t(`allocation.classes.${key}`)}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color, ...nunito }}>
                    CHF {Math.round(last).toLocaleString()} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                  </span>
                </div>
                {hist.length >= 2 ? (() => {
                  const min = Math.min(...hist) * 0.97;
                  const max = Math.max(...hist) * 1.03;
                  const range = max - min || 1;
                  const toY = (v: number) => 38 - ((v - min) / range) * 32;
                  const points = hist.map((v, i) => `${(i / Math.max(hist.length - 1, 1)) * 300},${toY(v)}`).join(" ");
                  return (
                    <svg viewBox="0 0 300 42" className="w-full h-10">
                      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={points} />
                    </svg>
                  );
                })() : <div className="h-10 flex items-center justify-center"><span className="text-[10px] text-muted-foreground">—</span></div>}
              </div>
            );
          })}
        </div>

        {/* Real-time leaderboard */}
        <div className="bg-card rounded-2xl p-3 shadow-md mb-4">
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

        {/* Event history chips */}
        {eventHistory.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] tracking-widest text-muted-foreground mb-1.5" style={{ ...nunito, fontWeight: 700 }}>
              {t("multiplayer.eventHistory")}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[...eventHistory].reverse().map((h, i) => {
                const s = h.decision === "sell" ? CHIP_SELL : h.decision === "buy" ? CHIP_BUY : CHIP_HOLD;
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

        {finished && (
          <div className="rounded-3xl p-5 text-center" style={{ backgroundColor: `${CELESTE}12`, border: `2px solid ${CELESTE}40` }}>
            <p className="text-lg font-black" style={{ ...nunito, color: CELESTE }}>{t("multiplayer.simFinished")}</p>
            <p className="text-xs text-muted-foreground mt-1" style={nunito}>{t("multiplayer.waitingResults")}</p>
          </div>
        )}
      </div>

      {/* Fixed decision bottom sheet — slides up when deciding phase */}
      <AnimatePresence>
        {eventActive && eventPhase === "deciding" && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl px-5 pt-4 pb-8"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}>

            {/* Timer */}
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-4 h-4 flex-shrink-0" style={{ color: CELESTE }} />
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                <motion.div className="h-full rounded-full"
                  style={{ width: `${(eventTimer / EVENT_TIMER) * 100}%`, backgroundColor: CELESTE }} />
              </div>
              <span className="text-sm font-black tabular-nums w-6 text-right" style={{ ...nunito, color: CELESTE }}>
                {eventTimer}s
              </span>
            </div>

            {/* Buy button (CHF 100 fixed) — top full width */}
            <motion.button
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 mb-3"
              style={{ ...nunito, backgroundColor: BTN_BUY.bg, borderColor: BTN_BUY.border, color: BTN_BUY.color }}
              onClick={() => handleEventDecision("buy")} whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <ShoppingCart className="w-4 h-4" />
              {t("multiplayer.buy")} -CHF {BUY_AMOUNT}
            </motion.button>

            {/* Sell + Hold — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                className="py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2"
                style={{ ...nunito, backgroundColor: BTN_SELL.bg, borderColor: BTN_SELL.border, color: BTN_SELL.color }}
                onClick={() => handleEventDecision("sell")} whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <ArrowDownFromLine className="w-4 h-4" />
                {t("multiplayer.sell")}
              </motion.button>
              <motion.button
                className="py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2"
                style={{ ...nunito, backgroundColor: BTN_HOLD.bg, borderColor: BTN_HOLD.border, color: BTN_HOLD.color }}
                onClick={() => handleEventDecision("hold")} whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Shield className="w-4 h-4" />
                {t("multiplayer.hold")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision feedback */}
      <AnimatePresence>
        {activeEvent && eventDecided && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl p-6 text-center shadow-2xl"
              initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
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
