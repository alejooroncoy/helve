import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FastForward, Pause, Play, TrendingUp, TrendingDown, AlertTriangle, Loader2, ShieldCheck, ShieldAlert, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import type { Investment } from "@/game/types";
import { ASSET_CLASSES } from "@/game/types";
import { useMonthlyPrices } from "@/hooks/useMarketData";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

interface TimeSimulationProps {
  portfolio: Investment[];
  initialMonths?: number;
  initialBalance?: number;
  onClose: () => void;
  onComplete?: (finalBalance: number, totalGainPct: number) => void;
  onSellInvestment: (id: string) => void;
  onAskCoach?: (question: string) => void;
}

interface TimePoint {
  month: number;
  label: string;
  value: number;
  event?: MarketEvent;
}

interface MarketEvent {
  id: string;
  emoji: string;
  title: string;
  description: string;
  impact: number;
  type: "positive" | "negative" | "neutral";
}

interface AIScenarioOption {
  action: "hold" | "sell" | "buy";
  label: string;
  is_best: boolean;
  feedback_good: string;
  feedback_bad: string;
}

interface AIScenario {
  title: string;
  description: string;
  options: AIScenarioOption[];
}

// Map category keys to their representative DB IDs
const categoryToDbIds: Record<string, string[]> = {};
ASSET_CLASSES.forEach(cls => {
  categoryToDbIds[cls.key] = cls.dbIds;
});

const marketEvents: MarketEvent[] = [
  { id: "boom", emoji: "", title: "Primavera financiera", description: "El mercado florece. Tu nido brilla.", impact: 1.12, type: "positive" },
  { id: "crash", emoji: "", title: "Tormenta en el mercado", description: "Los vientos soplan fuerte.", impact: 0.82, type: "negative" },
  { id: "steady", emoji: "", title: "Cielo despejado", description: "Todo tranquilo. Tu nido crece poco a poco.", impact: 1.03, type: "neutral" },
  { id: "tech-boom", emoji: "", title: "Boom tecnologico", description: "Las empresas tech despegan.", impact: 1.18, type: "positive" },
  { id: "recession", emoji: "", title: "Invierno economico", description: "Todo se enfria.", impact: 0.88, type: "negative" },
  { id: "green-wave", emoji: "", title: "Ola verde", description: "La energia limpia sube.", impact: 1.08, type: "positive" },
  { id: "inflation", emoji: "", title: "Inflacion alta", description: "Los precios suben.", impact: 0.93, type: "negative" },
  { id: "dividend", emoji: "", title: "Temporada de dividendos", description: "Tus inversiones generan extra.", impact: 1.06, type: "positive" },
  { id: "stable", emoji: "", title: "Nido estable", description: "Sin sorpresas. Tu nido se mantiene firme.", impact: 1.01, type: "neutral" },
  { id: "war", emoji: "", title: "Tension global", description: "El mundo se sacude. Los mercados tiemblan.", impact: 0.85, type: "negative" },
];

const ACTION_ICONS = {
  hold: ShieldCheck,
  sell: TrendingDown,
  buy: Zap,
};

const ACTION_COLORS = {
  hold: CELESTE,
  sell: "hsl(var(--destructive))",
  buy: "hsl(var(--primary))",
};

async function fetchAIScenario(portfolio: Investment[], balance: number, monthLabel: string, language: string): Promise<AIScenario | null> {
  try {
    const { data, error } = await supabase.functions.invoke("sim-event", {
      body: { portfolio, balance, monthLabel, language },
    });
    if (error || !data || !data.options) return null;
    return data as AIScenario;
  } catch {
    return null;
  }
}

const timeLabels = [
  "Hoy", "1 mes", "2 meses", "3 meses", "6 meses",
  "9 meses", "1 ano", "1.5 anos", "2 anos", "3 anos", "5 anos"
];
const timeMonths = [0, 1, 2, 3, 6, 9, 12, 18, 24, 36, 60];

const birdMessages = {
  positive: [
    "Tu nido brilla!",
    "Los huevos estan calentitos!",
    "Buen vuelo! Vas por buen camino.",
  ],
  negative: [
    "Aguanta! Las tormentas pasan.",
    "Los pajaros fuertes resisten el viento.",
    "No todo vuelo es suave, pero sigues volando!",
  ],
  neutral: [
    "Tranquilo, tu nido crece despacio pero seguro.",
    "Paciencia. El tiempo es tu amigo.",
    "Paso a paso se construye el mejor nido.",
  ],
  sell: [
    "Vendiste! A veces es bueno aligerar el nido.",
    "Fuera. Fue buena decision? Lo veremos...",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeRealMultipliers(
  prices: Record<string, { date: string; price: number }[]>,
  investmentIds: string[],
  months: number[]
): number[] {
  // For each category, get all its DB IDs and average their multipliers
  const allDbIds = investmentIds.flatMap(id => categoryToDbIds[id] || []);
  const available = allDbIds.filter(id => prices[id] && prices[id].length > 1);

  if (available.length === 0) return months.map(() => 1);

  const maxMonth = Math.max(...months);

  return months.map(month => {
    if (month === 0) return 1;

    const instrumentMultipliers = available.map(instrumentId => {
      const data = prices[instrumentId]!;
      const totalMonths = data.length;
      const startIdx = Math.max(0, totalMonths - maxMonth - 1);
      const basePrice = data[startIdx]?.price || 1;
      const targetIdx = Math.min(startIdx + month, totalMonths - 1);
      const targetPrice = data[targetIdx]?.price || basePrice;
      return basePrice > 0 ? targetPrice / basePrice : 1;
    });

    return instrumentMultipliers.reduce((sum, m) => sum + m, 0) / instrumentMultipliers.length;
  });
}

export default function TimeSimulation({ portfolio, initialMonths = 12, initialBalance = 1000, onClose, onComplete, onSellInvestment, onAskCoach }: TimeSimulationProps) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState<TimePoint[]>([]);
  const [birdMsg, setBirdMsg] = useState(t("timeSim.letsStart"));
  const [totalGain, setTotalGain] = useState(0);
  const [currentPortfolio, setCurrentPortfolio] = useState(portfolio);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI decision state
  const [aiScenario, setAiScenario] = useState<AIScenario | null>(null);
  const [showAIEvent, setShowAIEvent] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ text: string; isGood: boolean } | null>(null);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const aiScenarioCache = useRef<Record<number, AIScenario | null>>({});
  const aiFetchingRef = useRef<Set<number>>(new Set());

  // Cumulative multiplier from AI decisions (hold=1, sell=0.85, buy=1.10 or inverse if wrong)
  const decisionMultiplier = useRef(1);
  const aiDecisions = useRef<{ action: string; isGood: boolean }[]>([]);

  // Pick 2 random steps for AI events (not first or last)
  const aiEventSteps = useMemo(() => {
    const filteredCount = Math.max(0, initialMonths <= 6 ? 3 : initialMonths <= 12 ? 5 : 9);
    if (filteredCount < 4) return [];
    const candidates = [];
    for (let i = 2; i < filteredCount - 1; i++) candidates.push(i);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(2, shuffled.length)).sort((a, b) => a - b);
  }, [initialMonths]);

  const dbIds = useMemo(
    () => portfolio.flatMap(inv => categoryToDbIds[inv.id] || []).filter(Boolean),
    [portfolio]
  );
  const { prices, loading: pricesLoading } = useMonthlyPrices(dbIds);

  const filteredIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < timeMonths.length; i++) {
      if (timeMonths[i] <= initialMonths) indices.push(i);
    }
    return indices;
  }, [initialMonths]);
  const filteredMonths = filteredIndices.map(i => timeMonths[i]);
  const filteredLabels = filteredIndices.map(i => timeLabels[i]);
  const totalSteps = filteredMonths.length - 1;

  const realMultipliers = useMemo(() => {
    if (pricesLoading || Object.keys(prices).length === 0) return null;
    return computeRealMultipliers(prices, currentPortfolio.map(i => i.id), filteredMonths);
  }, [prices, pricesLoading, currentPortfolio, filteredMonths]);

  const startBalance = initialBalance;

  useEffect(() => {
    setData([{ month: 0, label: t("timeSim.today"), value: startBalance }]);
  }, []);

  // Pre-fetch AI scenarios 1 step before they're needed
  useEffect(() => {
    for (const eventStep of aiEventSteps) {
      const prefetchAt = Math.max(0, eventStep - 1);
      if (currentStep >= prefetchAt && !aiScenarioCache.current[eventStep] && !aiFetchingRef.current.has(eventStep)) {
        aiFetchingRef.current.add(eventStep);
        const lastValue = data[data.length - 1]?.value || startBalance;
        fetchAIScenario(currentPortfolio, lastValue, filteredLabels[eventStep] || "", i18n.language).then(scenario => {
          aiScenarioCache.current[eventStep] = scenario;
        });
      }
    }
  }, [currentStep, aiEventSteps, currentPortfolio, data, filteredLabels, i18n.language, startBalance]);

  const advanceStep = useCallback(() => {
    if (currentStep >= totalSteps || !realMultipliers) {
      setPlaying(false);
      return;
    }

    const nextStep = currentStep + 1;

    // Check if this step has an AI event ready
    if (aiEventSteps.includes(nextStep) && aiScenarioCache.current[nextStep]) {
      setAiScenario(aiScenarioCache.current[nextStep]!);
      setShowAIEvent(true);
      setPlaying(false);
      // Still advance data
      const realValue = startBalance * realMultipliers[nextStep];
      const newValue = Math.round(realValue * 100) / 100;
      const gain = ((newValue - startBalance) / startBalance) * 100;
      setTotalGain(Math.round(gain * 10) / 10);
      const point: TimePoint = {
        month: filteredMonths[nextStep],
        label: filteredLabels[nextStep],
        value: Math.round(newValue),
      };
      setData(prev => [...prev, point]);
      setCurrentStep(nextStep);
      return;
    }

    const realValue = startBalance * realMultipliers[nextStep];
    const newValue = Math.round(realValue * 100) / 100;
    const gain = ((newValue - startBalance) / startBalance) * 100;
    setTotalGain(Math.round(gain * 10) / 10);

    const prevMultiplier = realMultipliers[currentStep] || 1;
    const stepReturn = (realMultipliers[nextStep] / prevMultiplier) - 1;

    let event: MarketEvent | null = null;
    if (stepReturn < -0.08) {
      event = pickRandom(marketEvents.filter(e => e.type === "negative"));
      event = { ...event, impact: 1 + stepReturn };
    } else if (stepReturn > 0.10) {
      event = pickRandom(marketEvents.filter(e => e.type === "positive"));
      event = { ...event, impact: 1 + stepReturn };
    }

    const point: TimePoint = {
      month: filteredMonths[nextStep],
      label: filteredLabels[nextStep],
      value: Math.round(newValue),
      event: event || undefined,
    };

    setData(prev => [...prev, point]);

    if (event) {
      setCurrentEvent(event);
      setShowEvent(true);
      setPlaying(false);
      setBirdMsg(pickRandom(birdMessages[event.type]));
      if (event.type === "negative") {
        setShowSellPrompt(true);
      }
    } else {
      const msgType = stepReturn > 0.02 ? "positive" : stepReturn < -0.02 ? "negative" : "neutral";
      setBirdMsg(pickRandom(birdMessages[msgType]));
    }

    setCurrentStep(nextStep);
  }, [currentStep, totalSteps, realMultipliers, filteredMonths, filteredLabels, aiEventSteps, startBalance]);

  const handleAIChoice = (option: AIScenarioOption) => {
    setShowAIEvent(false);
    setAiFeedback({
      text: option.is_best ? option.feedback_good : option.feedback_bad,
      isGood: option.is_best,
    });
    setShowAIFeedback(true);
  };

  const dismissAIFeedback = () => {
    setShowAIFeedback(false);
    setAiFeedback(null);
    setAiScenario(null);
    setPlaying(true);
  };

  useEffect(() => {
    if (playing && currentStep < totalSteps) {
      intervalRef.current = setTimeout(advanceStep, 1500);
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [playing, currentStep, advanceStep]);

  const handleSell = (invId: string) => {
    setCurrentPortfolio((prev) => prev.filter((i) => i.id !== invId));
    onSellInvestment(invId);
    setBirdMsg(pickRandom(birdMessages.sell));
    setShowSellPrompt(false);
    setShowEvent(false);
    setPlaying(true);
  };

  const handleHold = () => {
    setShowSellPrompt(false);
    setShowEvent(false);
    setBirdMsg("Aguantas firme!");
    setPlaying(true);
  };

  const dismissEvent = () => {
    setShowEvent(false);
    setShowSellPrompt(false);
    setPlaying(true);
  };

  const isFinished = currentStep >= totalSteps;
  const lastValue = data[data.length - 1]?.value || startBalance;
  const isPositive = lastValue >= startBalance;

  if (pricesLoading) {
    return (
      <motion.div
        className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: CELESTE }} />
        <p className="text-sm text-muted-foreground font-medium" style={nunito}>{t("timeSim.loadingMarket")}</p>
      </motion.div>
    );
  }

  const periodLabel = initialMonths <= 6
    ? `${initialMonths} meses`
    : initialMonths === 12
    ? "1 año"
    : "5 años";

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide" style={nunito}>
            {t("timeSim.simulation")} · {periodLabel} · {t("timeSim.realData")}
          </p>
          <h1 className="text-xl font-bold text-foreground mt-0.5" style={nunito}>
            {isFinished ? t("timeSim.flightComplete") : t("timeSim.nestInTime")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase" style={nunito}>{t("timeSim.invested")}</p>
          <p className="text-base font-bold text-foreground" style={nunito}>CHF {startBalance}</p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase" style={nunito}>{t("timeSim.currentValue")}</p>
          <p className="text-base font-bold" style={{ ...nunito, color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
            CHF {lastValue.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase" style={nunito}>{t("timeSim.gain")}</p>
          <p className="text-base font-bold flex items-center justify-center gap-1" style={{ ...nunito, color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {totalGain > 0 ? "+" : ""}{totalGain}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 flex-1 min-h-0">
        <div className="bg-card rounded-3xl p-4 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-foreground" style={nunito}>
              {data.length > 1 ? filteredLabels[currentStep] : t("timeSim.today")}
            </p>
            <div className="flex items-center gap-1">
              {currentPortfolio.map((inv) => (
                <span key={inv.id} className="text-xs font-medium text-muted-foreground">{inv.name.slice(0, 3)}</span>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CELESTE}
                  strokeWidth={3}
                  dot={false}
                  animationDuration={500}
                />
                {data.filter((d) => d.event).map((d, i) => (
                  <ReferenceDot
                    key={i}
                    x={d.label}
                    y={d.value}
                    r={6}
                    fill={d.event?.type === "positive" ? "hsl(var(--primary))" : d.event?.type === "negative" ? "hsl(var(--destructive))" : "hsl(var(--accent))"}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bird message */}
      <div className="px-5 py-3">
        <motion.div
          key={birdMsg}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${CELESTE}30` }}>
            <img src="/face.png" alt="Coach" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-foreground font-medium flex-1" style={nunito}>{birdMsg}</p>
        </motion.div>
      </div>

      {/* Event overlay */}
      <AnimatePresence>
        {showEvent && currentEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full text-center"
            >
              <h2 className="text-lg font-bold text-foreground mb-1" style={nunito}>{currentEvent.title}</h2>
              <p className="text-sm text-muted-foreground mb-4" style={nunito}>{currentEvent.description}</p>

              {currentEvent.type === "negative" && (
                <div className="flex items-center gap-1.5 justify-center text-xs text-destructive font-medium mb-4" style={nunito}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t("timeSim.nestDropped", { pct: Math.round((1 - currentEvent.impact) * 100) })}
                </div>
              )}
              {currentEvent.type === "positive" && (
                <div className="flex items-center gap-1.5 justify-center text-xs font-medium mb-4" style={{ ...nunito, color: "hsl(var(--primary))" }}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t("timeSim.nestRose", { pct: Math.round((currentEvent.impact - 1) * 100) })}
                </div>
              )}

              {showSellPrompt && currentPortfolio.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground mb-2" style={nunito}>{t("timeSim.whatToDo")}</p>
                  {onAskCoach && (
                    <motion.button
                      onClick={() => onAskCoach(`Hay ${currentEvent.title.toLowerCase()} y mi nido bajó ${Math.round((1 - currentEvent.impact) * 100)}%. ¿Debería vender algo o mantener? Tengo: ${currentPortfolio.map(i => i.name).join(", ")}`)}
                      className="w-full py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border"
                      style={{ ...nunito, backgroundColor: `${CELESTE}10`, color: CELESTE, borderColor: `${CELESTE}30` }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {t("timeSim.askCoach")}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleHold}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                    style={{ ...nunito, backgroundColor: CELESTE }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t("timeSim.holdAll")}
                  </motion.button>
                  <p className="text-[10px] text-muted-foreground" style={nunito}>{t("timeSim.orSell")}</p>
                  <div className="space-y-1.5">
                    {currentPortfolio.map((inv) => (
                      <motion.button
                        key={inv.id}
                        onClick={() => handleSell(inv.id)}
                        className="w-full bg-destructive/10 text-destructive py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        style={nunito}
                        whileTap={{ scale: 0.97 }}
                      >
                        {t("timeSim.sellInv", { name: inv.name })}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {onAskCoach && (
                    <motion.button
                      onClick={() => onAskCoach(`Pasó "${currentEvent.title}" en el mercado. ¿Qué significa esto para mi nido?`)}
                      className="w-full py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border"
                      style={{ ...nunito, backgroundColor: `${CELESTE}10`, color: CELESTE, borderColor: `${CELESTE}30` }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {t("timeSim.whatDoesThisMean")}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={dismissEvent}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                    style={{ ...nunito, backgroundColor: CELESTE }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {currentEvent.type === "positive" ? t("timeSim.great") : t("timeSim.letsKeepGoing")}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Battle Royale Event overlay */}
      <AnimatePresence>
        {showAIEvent && aiScenario && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CELESTE}15` }}>
                <AlertTriangle className="w-6 h-6" style={{ color: CELESTE }} />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1" style={nunito}>{aiScenario.title}</h2>
              <p className="text-sm text-muted-foreground mb-5" style={nunito}>{aiScenario.description}</p>

              <div className="space-y-2.5">
                {aiScenario.options.map((option) => {
                  const Icon = ACTION_ICONS[option.action];
                  const color = ACTION_COLORS[option.action];
                  return (
                    <motion.button
                      key={option.action}
                      onClick={() => handleAIChoice(option)}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border"
                      style={{ ...nunito, borderColor: `${typeof color === 'string' && color.startsWith('#') ? color : CELESTE}30`, color }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Feedback overlay */}
      <AnimatePresence>
        {showAIFeedback && aiFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full text-center"
            >
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{
                  backgroundColor: aiFeedback.isGood ? "hsl(var(--primary)/0.1)" : "hsl(var(--destructive)/0.1)",
                }}
              >
                {aiFeedback.isGood
                  ? <ShieldCheck className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
                  : <ShieldAlert className="w-7 h-7" style={{ color: "hsl(var(--destructive))" }} />
                }
              </div>
              <h3
                className="text-base font-bold mb-2"
                style={{
                  ...nunito,
                  color: aiFeedback.isGood ? "hsl(var(--primary))" : "hsl(var(--destructive))",
                }}
              >
                {aiFeedback.isGood
                  ? (i18n.language === "es" ? "Buena decisión" : "Great call!")
                  : (i18n.language === "es" ? "No te preocupes" : "Don't worry!")
                }
              </h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed" style={nunito}>
                {aiFeedback.text}
              </p>
              <motion.button
                onClick={dismissAIFeedback}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ ...nunito, backgroundColor: CELESTE }}
                whileTap={{ scale: 0.97 }}
              >
                {i18n.language === "es" ? "Continuar" : "Continue"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="px-5 pb-6 pt-2">
        {isFinished ? (
          <div className="space-y-2">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-3 rounded-2xl text-sm font-bold"
              style={{
                ...nunito,
                backgroundColor: isPositive ? "hsl(var(--primary)/0.1)" : "hsl(var(--destructive)/0.1)",
                color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))",
              }}
            >
              {isPositive
                ? t("timeSim.nestGrew", { amount: (lastValue - startBalance).toFixed(0), period: periodLabel })
                : t("timeSim.nestShrunk", { amount: (startBalance - lastValue).toFixed(0), period: periodLabel })
              }
            </motion.div>
            <motion.button
              onClick={() => {
                const finalVal = data.length > 0 ? data[data.length - 1].value : startBalance;
                onComplete?.(Math.round(finalVal), totalGain);
                onClose();
              }}
              className="w-full py-4 rounded-3xl text-base font-bold text-white"
              style={{ ...nunito, backgroundColor: CELESTE }}
              whileTap={{ scale: 0.97 }}
            >
              {t("timeSim.backToNest")}
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-3">
            <motion.button
              onClick={() => realMultipliers && setPlaying(!playing)}
              className="flex-1 bg-card text-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
              style={{ ...nunito, opacity: realMultipliers ? 1 : 0.5 }}
              whileTap={{ scale: 0.95 }}
            >
              {playing ? <><Pause className="w-4 h-4" /> {t("timeSim.pause")}</> : <><Play className="w-4 h-4" /> {currentStep === 0 ? t("timeSim.start") : t("timeSim.resume")}</>}
            </motion.button>
            {!playing && realMultipliers && (
              <motion.button
                onClick={advanceStep}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 text-white"
                style={{ ...nunito, backgroundColor: CELESTE }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <FastForward className="w-4 h-4" /> {t("timeSim.advance")}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
