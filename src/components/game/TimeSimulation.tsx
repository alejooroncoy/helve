import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FastForward, Pause, Play, TrendingUp, TrendingDown, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import type { Investment } from "@/game/types";
import { useMonthlyPrices } from "@/hooks/useMarketData";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

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
  event?: AIScenario;
}

interface AIScenario {
  emoji: string;
  title: string;
  description: string;
  educationalTip: string;
  options: {
    id: "hold" | "sell_worst" | "ask_coach";
    emoji: string;
    label: string;
    description: string;
  }[];
  movePct: number;
  moveType: "positive" | "negative";
}

const investmentToDbId: Record<string, string> = {
  "ch-bond-aaa": "ch-bond-aaa",
  "global-bond": "global-bond-agg",
  "ch-govt-10y": "ch-govt-10y",
  "smi-index": "smi-index",
  "eurostoxx50": "eurostoxx50",
  "gold-chf": "gold-chf",
  "nestle": "nesn-ch",
  "novartis": "novn-ch",
  "djia-index": "djia-index",
  "dax-index": "dax-index",
  "apple": "aapl-us",
  "microsoft": "msft-us",
  "nvidia": "nvda-us",
  "logitech": "logn-ch",
  "ubs": "ubsg-ch",
  "amazon": "amzn-us",
  "green-energy": "smi-index",
};

const nunito = { fontFamily: "'Nunito', sans-serif" };
const CELESTE = "#5BB8F5";

const timeLabels: Record<string, string[]> = {
  en: ["Today", "1 mo", "2 mo", "3 mo", "6 mo", "9 mo", "1 yr", "1.5 yr", "2 yr", "3 yr", "5 yr"],
  es: ["Hoy", "1 mes", "2 meses", "3 meses", "6 meses", "9 meses", "1 año", "1.5 años", "2 años", "3 años", "5 años"],
};
const timeMonths = [0, 1, 2, 3, 6, 9, 12, 18, 24, 36, 60];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeRealMultipliers(
  prices: Record<string, { date: string; price: number }[]>,
  investmentIds: string[],
  months: number[]
): number[] {
  const dbIds = investmentIds.map(id => investmentToDbId[id] || id);
  const available = dbIds.filter(id => prices[id] && prices[id].length > 1);
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

async function fetchAIScenario(
  portfolio: Investment[],
  movePct: number,
  moveType: "positive" | "negative",
  periodLabel: string,
  lang: string
): Promise<AIScenario | null> {
  try {
    const { data, error } = await supabase.functions.invoke("sim-scenario", {
      body: { portfolio, movePct, moveType, periodLabel, lang },
    });
    if (error) {
      console.error("sim-scenario error:", error);
      return null;
    }
    return { ...data, movePct, moveType };
  } catch (e) {
    console.error("fetchAIScenario error:", e);
    return null;
  }
}

export default function TimeSimulation({ portfolio, initialMonths = 12, initialBalance = 1000, onClose, onComplete, onSellInvestment, onAskCoach }: TimeSimulationProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("es") ? "es" : "en";
  const labels = timeLabels[lang] || timeLabels.en;

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState<TimePoint[]>([]);
  const [currentScenario, setCurrentScenario] = useState<AIScenario | null>(null);
  const [birdMsg, setBirdMsg] = useState(t("timeSim.letsStart"));
  const [showEvent, setShowEvent] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [totalGain, setTotalGain] = useState(0);
  const [currentPortfolio, setCurrentPortfolio] = useState(portfolio);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dbIds = useMemo(
    () => portfolio.map(inv => investmentToDbId[inv.id] || inv.id).filter(Boolean),
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
  const filteredLabels = filteredIndices.map(i => labels[i]);
  const totalSteps = filteredMonths.length - 1;

  const realMultipliers = useMemo(() => {
    if (pricesLoading || Object.keys(prices).length === 0) return null;
    return computeRealMultipliers(prices, currentPortfolio.map(i => i.id), filteredMonths);
  }, [prices, pricesLoading, currentPortfolio, filteredMonths]);

  const startBalance = initialBalance;

  useEffect(() => {
    setData([{ month: 0, label: labels[0], value: startBalance }]);
  }, []);

  const birdMsgs = useMemo(() => ({
    positive: t("birdMessages.positive", { returnObjects: true }) as string[],
    negative: t("birdMessages.negative", { returnObjects: true }) as string[],
    neutral: t("birdMessages.neutral", { returnObjects: true }) as string[],
    sell: t("birdMessages.sell", { returnObjects: true }) as string[],
    held: t("birdMessages.held") as string,
  }), [t]);

  const advanceStep = useCallback(async () => {
    if (currentStep >= totalSteps || !realMultipliers) {
      setPlaying(false);
      return;
    }

    const nextStep = currentStep + 1;
    const realValue = startBalance * realMultipliers[nextStep];
    const newValue = Math.round(realValue * 100) / 100;
    const gain = ((newValue - startBalance) / startBalance) * 100;
    setTotalGain(Math.round(gain * 10) / 10);

    const prevMultiplier = realMultipliers[currentStep] || 1;
    const stepReturn = (realMultipliers[nextStep] / prevMultiplier) - 1;
    const movePct = stepReturn * 100;

    const point: TimePoint = {
      month: filteredMonths[nextStep],
      label: filteredLabels[nextStep],
      value: Math.round(newValue),
    };

    // Significant move → fetch AI scenario
    if (Math.abs(stepReturn) > 0.08) {
      setPlaying(false);
      setLoadingScenario(true);

      setData(prev => [...prev, point]);
      setCurrentStep(nextStep);

      const moveType = stepReturn < 0 ? "negative" : "positive";
      const periodLabel = initialMonths <= 6
        ? `${initialMonths} ${lang === "es" ? "meses" : "months"}`
        : initialMonths === 12
        ? (lang === "es" ? "1 año" : "1 year")
        : (lang === "es" ? "5 años" : "5 years");

      const scenario = await fetchAIScenario(currentPortfolio, movePct, moveType, periodLabel, lang);

      setLoadingScenario(false);

      if (scenario) {
        setCurrentScenario(scenario);
        setShowEvent(true);
        setBirdMsg(pickRandom(moveType === "negative" ? birdMsgs.negative : birdMsgs.positive));
      } else {
        // Fallback: no AI, just show bird message
        setBirdMsg(pickRandom(stepReturn > 0 ? birdMsgs.positive : birdMsgs.negative));
        setPlaying(true);
      }
    } else {
      setData(prev => [...prev, point]);
      setCurrentStep(nextStep);
      const msgType = stepReturn > 0.02 ? "positive" : stepReturn < -0.02 ? "negative" : "neutral";
      setBirdMsg(pickRandom(birdMsgs[msgType]));
    }
  }, [currentStep, totalSteps, realMultipliers, filteredMonths, filteredLabels, currentPortfolio, birdMsgs, initialMonths, lang, startBalance]);

  useEffect(() => {
    if (playing && currentStep < totalSteps && !loadingScenario) {
      intervalRef.current = setTimeout(advanceStep, 1500);
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [playing, currentStep, advanceStep, loadingScenario]);

  const handleScenarioChoice = (optionId: string) => {
    if (optionId === "hold") {
      setBirdMsg(birdMsgs.held);
      setShowEvent(false);
      setCurrentScenario(null);
      setPlaying(true);
    } else if (optionId === "sell_worst") {
      // Sell the riskiest investment
      const riskiest = [...currentPortfolio].sort((a, b) => b.riskLevel - a.riskLevel)[0];
      if (riskiest) {
        setCurrentPortfolio(prev => prev.filter(i => i.id !== riskiest.id));
        onSellInvestment(riskiest.id);
        setBirdMsg(pickRandom(birdMsgs.sell));
      }
      setShowEvent(false);
      setCurrentScenario(null);
      setPlaying(true);
    } else if (optionId === "ask_coach") {
      if (onAskCoach && currentScenario) {
        onAskCoach(`${currentScenario.title}: ${currentScenario.description}. ${lang === "es" ? "¿Qué debería hacer con mi nido?" : "What should I do with my nest?"} ${currentPortfolio.map(i => i.name).join(", ")}`);
      }
      setShowEvent(false);
      setCurrentScenario(null);
      setPlaying(true);
    }
  };

  const dismissEvent = () => {
    setShowEvent(false);
    setCurrentScenario(null);
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium" style={nunito}>{t("timeSim.loadingMarket")}</p>
      </motion.div>
    );
  }

  const periodLabel = initialMonths <= 6
    ? `${initialMonths} ${t("simulation.periods.3m").replace("3", "").trim()}`
    : initialMonths === 12
    ? t("simulation.periods.1y")
    : t("simulation.periods.5y");

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
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-2.5 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase" style={nunito}>{t("timeSim.invested")}</p>
          <p className="text-sm sm:text-lg font-bold text-foreground" style={nunito}>CHF {startBalance}</p>
        </div>
        <div className="bg-card rounded-2xl p-2.5 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase" style={nunito}>{t("timeSim.currentValue")}</p>
          <p className={`text-sm sm:text-lg font-bold ${isPositive ? "text-primary" : "text-destructive"}`} style={nunito}>
            CHF {lastValue.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-2.5 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase" style={nunito}>{t("timeSim.gain")}</p>
          <p className={`text-sm sm:text-lg font-bold flex items-center justify-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`} style={nunito}>
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
              📈 {data.length > 1 ? filteredLabels[currentStep] : labels[0]}
            </p>
            <div className="flex items-center gap-1">
              {currentPortfolio.map((inv) => (
                <span key={inv.id} className="text-sm" title={inv.name}>{inv.emoji}</span>
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
                  stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
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
                    fill={d.event?.moveType === "positive" ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
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
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/20">
            <img src="/face.png" alt="Coach" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-foreground font-medium flex-1" style={nunito}>{birdMsg}</p>
          {loadingScenario && (
            <div className="flex items-center gap-1.5 text-accent">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-bold" style={nunito}>AI</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* AI Scenario overlay */}
      <AnimatePresence>
        {showEvent && currentScenario && (
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
              className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full"
            >
              {/* AI badge */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider" style={nunito}>
                  AI Scenario
                </span>
              </div>

              <div className="text-center mb-4">
                <span className="text-5xl block mb-3">{currentScenario.emoji}</span>
                <h2 className="text-lg font-bold text-foreground mb-1" style={nunito}>{currentScenario.title}</h2>
                <p className="text-sm text-muted-foreground" style={nunito}>{currentScenario.description}</p>
              </div>

              {/* Impact indicator */}
              <div className={`flex items-center gap-1.5 justify-center text-xs font-medium mb-3 ${currentScenario.moveType === "negative" ? "text-destructive" : "text-primary"}`}>
                {currentScenario.moveType === "negative" ? (
                  <><AlertTriangle className="w-3.5 h-3.5" /> {t("timeSim.nestDropped", { pct: Math.abs(currentScenario.movePct).toFixed(1) })}</>
                ) : (
                  <><TrendingUp className="w-3.5 h-3.5" /> {t("timeSim.nestRose", { pct: currentScenario.movePct.toFixed(1) })}</>
                )}
              </div>

              {/* Educational tip */}
              <div className="bg-accent/10 rounded-2xl p-3 mb-4 flex items-start gap-2">
                <span className="text-sm">💡</span>
                <p className="text-[11px] text-foreground/80 leading-relaxed" style={nunito}>
                  {currentScenario.educationalTip}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentScenario.options.map((opt) => {
                  const isHold = opt.id === "hold";
                  const isCoach = opt.id === "ask_coach";
                  const isSell = opt.id === "sell_worst";

                  return (
                    <motion.button
                      key={opt.id}
                      onClick={() => handleScenarioChoice(opt.id)}
                      className={`w-full py-3 px-4 rounded-2xl text-sm font-bold flex items-center gap-3 text-left transition-colors ${
                        isHold
                          ? "bg-primary text-primary-foreground"
                          : isCoach
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "bg-destructive/10 text-destructive"
                      }`}
                      style={nunito}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="text-lg flex-shrink-0">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className={`text-[10px] mt-0.5 opacity-80 ${isHold ? "text-primary-foreground/80" : ""}`}>
                          {opt.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading scenario overlay */}
      <AnimatePresence>
        {loadingScenario && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-card rounded-3xl p-6 shadow-xl flex flex-col items-center gap-3"
            >
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              <p className="text-sm font-bold text-foreground" style={nunito}>
                {lang === "es" ? "Generando escenario..." : "Generating scenario..."}
              </p>
              <p className="text-[10px] text-muted-foreground" style={nunito}>
                {lang === "es" ? "Analizando datos históricos con IA" : "Analyzing historical data with AI"}
              </p>
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
              className={`text-center py-3 rounded-2xl text-sm font-bold ${isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
              style={nunito}
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
              className="w-full bg-primary text-primary-foreground py-4 rounded-3xl text-base font-bold"
              style={nunito}
              whileTap={{ scale: 0.97 }}
            >
              {t("timeSim.backToNest")}
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-3">
            <motion.button
              onClick={() => realMultipliers && !loadingScenario && setPlaying(!playing)}
              className="flex-1 bg-card text-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
              style={{ ...nunito, opacity: realMultipliers && !loadingScenario ? 1 : 0.5 }}
              whileTap={{ scale: 0.95 }}
            >
              {playing ? <><Pause className="w-4 h-4" /> {t("timeSim.pause")}</> : <><Play className="w-4 h-4" /> {currentStep === 0 ? t("timeSim.start") : t("timeSim.resume")}</>}
            </motion.button>
            {!playing && realMultipliers && !loadingScenario && (
              <motion.button
                onClick={advanceStep}
                className="flex-1 bg-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                style={nunito}
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
