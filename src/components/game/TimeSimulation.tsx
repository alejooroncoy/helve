import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FastForward, Pause, Play, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import type { Investment } from "@/game/types";
import { useMonthlyPrices } from "@/hooks/useMarketData";

interface TimeSimulationProps {
  portfolio: Investment[];
  initialMonths?: number;
  onClose: () => void;
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

// Map game investment IDs to DB instrument IDs
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

const marketEvents: MarketEvent[] = [
  { id: "boom", emoji: "☀️", title: "¡Primavera financiera!", description: "El mercado florece. Tu nido brilla.", impact: 1.12, type: "positive" },
  { id: "crash", emoji: "🌪️", title: "¡Tormenta en el mercado!", description: "Los vientos soplan fuerte. ¿Mantienes tus huevos?", impact: 0.82, type: "negative" },
  { id: "steady", emoji: "🌤️", title: "Cielo despejado", description: "Todo tranquilo. Tu nido crece poco a poco.", impact: 1.03, type: "neutral" },
  { id: "tech-boom", emoji: "🚀", title: "¡Boom tecnológico!", description: "Las empresas tech despegan. Los nidos con tech crecen más.", impact: 1.18, type: "positive" },
  { id: "recession", emoji: "🥶", title: "Invierno económico", description: "Todo se enfría. Los pájaros más valientes aguantan.", impact: 0.88, type: "negative" },
  { id: "green-wave", emoji: "🌱", title: "Ola verde", description: "La energía limpia sube. ¡El futuro es verde!", impact: 1.08, type: "positive" },
  { id: "inflation", emoji: "🔥", title: "¡Inflación alta!", description: "Los precios suben. Tu nido pierde un poco de calor.", impact: 0.93, type: "negative" },
  { id: "dividend", emoji: "🥚", title: "¡Temporada de dividendos!", description: "Tus inversiones ponen huevos extra.", impact: 1.06, type: "positive" },
  { id: "stable", emoji: "🪺", title: "Nido estable", description: "Sin sorpresas. Tu nido se mantiene firme.", impact: 1.01, type: "neutral" },
  { id: "war", emoji: "⚡", title: "Tensión global", description: "El mundo se sacude. Los mercados tiemblan.", impact: 0.85, type: "negative" },
];

const timeLabels = [
  "Hoy", "1 mes", "2 meses", "3 meses", "6 meses",
  "9 meses", "1 año", "1.5 años", "2 años", "3 años", "5 años"
];
const timeMonths = [0, 1, 2, 3, 6, 9, 12, 18, 24, 36, 60];

const birdMessages = {
  positive: [
    "¡Tu nido brilla! 🌟",
    "¡Los huevos están calentitos! 🥚✨",
    "¡Buen vuelo! Vas por buen camino 🐦",
  ],
  negative: [
    "¡Aguanta! Las tormentas pasan 🌧️",
    "Los pájaros fuertes resisten el viento 💪",
    "No todo vuelo es suave, ¡pero sigues volando! 🦅",
  ],
  neutral: [
    "Tranquilo, tu nido crece despacio pero seguro 🪺",
    "Paciencia, pajarito. El tiempo es tu amigo ⏳",
    "Paso a paso se construye el mejor nido 🐣",
  ],
  sell: [
    "¡Vendiste! A veces es bueno aligerar el nido 🍃",
    "Huevo fuera. ¿Fue buena decisión? Lo veremos... 🤔",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pre-compute portfolio multipliers from real DB monthly prices.
 * For each time step (month index), returns the equal-weighted portfolio multiplier
 * relative to the start, using the LAST N months of real historical data.
 */
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
      // Take the last maxMonth+1 data points as our window
      const startIdx = Math.max(0, totalMonths - maxMonth - 1);
      const basePrice = data[startIdx]?.price || 1;
      // Target index for this month
      const targetIdx = Math.min(startIdx + month, totalMonths - 1);
      const targetPrice = data[targetIdx]?.price || basePrice;
      return basePrice > 0 ? targetPrice / basePrice : 1;
    });

    // Equal-weighted average
    return instrumentMultipliers.reduce((sum, m) => sum + m, 0) / instrumentMultipliers.length;
  });
}

export default function TimeSimulation({ portfolio, initialMonths = 12, onClose, onSellInvestment, onAskCoach }: TimeSimulationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState<TimePoint[]>([]);
  const [currentEvent, setCurrentEvent] = useState<MarketEvent | null>(null);
  const [birdMsg, setBirdMsg] = useState("¡Empecemos! Veamos cómo vuela tu nido 🐦");
  const [showEvent, setShowEvent] = useState(false);
  const [showSellPrompt, setShowSellPrompt] = useState(false);
  const [totalGain, setTotalGain] = useState(0);
  const [currentPortfolio, setCurrentPortfolio] = useState(portfolio);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch real market data from DB
  const dbIds = useMemo(
    () => portfolio.map(inv => investmentToDbId[inv.id] || inv.id).filter(Boolean),
    [portfolio]
  );
  const { prices, loading: pricesLoading } = useMonthlyPrices(dbIds);

  // Filter timeline steps based on selected period
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

  // Pre-compute real multipliers for the entire timeline from DB data
  const realMultipliers = useMemo(() => {
    if (pricesLoading || Object.keys(prices).length === 0) return null;
    return computeRealMultipliers(prices, currentPortfolio.map(i => i.id), filteredMonths);
  }, [prices, pricesLoading, currentPortfolio, filteredMonths]);

  const startBalance = 1000;

  // Initialize first data point
  useEffect(() => {
    setData([{ month: 0, label: "Hoy", value: startBalance }]);
  }, []);

  // Advance one step using real data
  const advanceStep = useCallback(() => {
    if (currentStep >= totalSteps || !realMultipliers) {
      setPlaying(false);
      return;
    }

    const nextStep = currentStep + 1;

    // Real portfolio value from historical data
    const realValue = startBalance * realMultipliers[nextStep];
    const newValue = Math.round(realValue * 100) / 100;

    const gain = ((newValue - startBalance) / startBalance) * 100;
    setTotalGain(Math.round(gain * 10) / 10);

    // Detect if this step had a significant move → show contextual event
    const prevMultiplier = realMultipliers[currentStep] || 1;
    const stepReturn = (realMultipliers[nextStep] / prevMultiplier) - 1;

    let event: MarketEvent | null = null;
    if (stepReturn < -0.08) {
      // Big drop — pick a negative event
      event = pickRandom(marketEvents.filter(e => e.type === "negative"));
      event = { ...event, impact: 1 + stepReturn }; // use real impact
    } else if (stepReturn > 0.10) {
      // Big gain — pick a positive event
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
  }, [currentStep, totalSteps, realMultipliers, filteredMonths, filteredLabels]);

  // Auto-play timer
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
    setBirdMsg("¡Mantuviste! Los pájaros valientes aguantan la tormenta 💪");
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

  // Loading state
  if (pricesLoading) {
    return (
      <motion.div
        className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Cargando datos reales del mercado...</p>
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
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Simulación · {periodLabel} · datos reales
          </p>
          <h1 className="text-xl font-bold text-foreground mt-0.5">
            {isFinished ? "¡Vuelo completado!" : "Tu nido en el tiempo"}
          </h1>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Invertido</p>
          <p className="text-lg font-bold text-foreground">CHF {startBalance}</p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Valor actual</p>
          <p className={`text-lg font-bold ${isPositive ? "text-primary" : "text-destructive"}`}>
            CHF {lastValue.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Ganancia</p>
          <p className={`text-lg font-bold flex items-center justify-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {totalGain > 0 ? "+" : ""}{totalGain}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 flex-1 min-h-0">
        <div className="bg-card rounded-3xl p-4 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-foreground">
              📈 {data.length > 1 ? filteredLabels[currentStep] : "Hoy"}
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
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/20">
            <img src="/face.png" alt="Coach" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-foreground font-medium flex-1">{birdMsg}</p>
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
              <span className="text-5xl block mb-3">{currentEvent.emoji}</span>
              <h2 className="text-lg font-bold text-foreground mb-1">{currentEvent.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{currentEvent.description}</p>

              {currentEvent.type === "negative" && (
                <div className="flex items-center gap-1.5 justify-center text-xs text-destructive font-medium mb-4">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Tu nido bajó {Math.round((1 - currentEvent.impact) * 100)}%
                </div>
              )}
              {currentEvent.type === "positive" && (
                <div className="flex items-center gap-1.5 justify-center text-xs text-primary font-medium mb-4">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Tu nido subió {Math.round((currentEvent.impact - 1) * 100)}%
                </div>
              )}

              {showSellPrompt && currentPortfolio.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground mb-2">¿Qué quieres hacer?</p>
                  {onAskCoach && (
                    <motion.button
                      onClick={() => onAskCoach(`Hay ${currentEvent.title.toLowerCase()} y mi nido bajó ${Math.round((1 - currentEvent.impact) * 100)}%. ¿Debería vender algo o mantener? Tengo: ${currentPortfolio.map(i => i.name).join(", ")}`)}
                      className="w-full bg-accent/10 text-accent py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border border-accent/20"
                      whileTap={{ scale: 0.97 }}
                    >
                      🐦 Pregúntale al coach
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleHold}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-2xl text-sm font-bold"
                    whileTap={{ scale: 0.97 }}
                  >
                    🦅 ¡Aguantar! Mantengo todo
                  </motion.button>
                  <p className="text-[10px] text-muted-foreground">o vende una inversión:</p>
                  <div className="space-y-1.5">
                    {currentPortfolio.map((inv) => (
                      <motion.button
                        key={inv.id}
                        onClick={() => handleSell(inv.id)}
                        className="w-full bg-destructive/10 text-destructive py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        whileTap={{ scale: 0.97 }}
                      >
                        {inv.emoji} Vender {inv.name}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {onAskCoach && (
                    <motion.button
                      onClick={() => onAskCoach(`Pasó "${currentEvent.title}" en el mercado. ¿Qué significa esto para mi nido?`)}
                      className="w-full bg-accent/10 text-accent py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border border-accent/20"
                      whileTap={{ scale: 0.97 }}
                    >
                      🐦 ¿Qué significa esto?
                    </motion.button>
                  )}
                  <motion.button
                    onClick={dismissEvent}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-2xl text-sm font-bold"
                    whileTap={{ scale: 0.97 }}
                  >
                    {currentEvent.type === "positive" ? "🎉 ¡Genial!" : "💪 ¡Seguimos!"}
                  </motion.button>
                </div>
              )}
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
            >
              {isPositive
                ? `🎉 ¡Tu nido creció! Ganaste CHF ${(lastValue - startBalance).toFixed(0)} en ${periodLabel}`
                : `😅 Tu nido se encogió CHF ${(startBalance - lastValue).toFixed(0)} en ${periodLabel}. ¡Pero aprendiste!`
              }
            </motion.div>
            <motion.button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground py-4 rounded-3xl text-base font-bold"
              whileTap={{ scale: 0.97 }}
            >
              🪺 Volver a mi nido
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-3">
            <motion.button
              onClick={() => realMultipliers && setPlaying(!playing)}
              className="flex-1 bg-card text-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
              style={{ opacity: realMultipliers ? 1 : 0.5 }}
              whileTap={{ scale: 0.95 }}
            >
              {playing ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> {currentStep === 0 ? "Empezar" : "Continuar"}</>}
            </motion.button>
            {!playing && realMultipliers && (
              <motion.button
                onClick={advanceStep}
                className="flex-1 bg-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <FastForward className="w-4 h-4" /> Avanzar
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
