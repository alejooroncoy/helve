import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FastForward, Pause, Play, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import type { Investment } from "@/game/types";

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
  impact: number; // multiplier, e.g. 0.85 = -15%, 1.15 = +15%
  type: "positive" | "negative" | "neutral";
}

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

  const startBalance = 1000;

  // Calculate base monthly return from portfolio
  const getMonthlyReturn = useCallback(() => {
    if (currentPortfolio.length === 0) return 0;
    const avgAnnual = currentPortfolio.reduce((s, i) => s + i.annualReturn, 0) / currentPortfolio.length;
    // Add some randomness: ±30% of expected return
    const randomFactor = 0.7 + Math.random() * 0.6;
    return (avgAnnual / 100 / 12) * randomFactor;
  }, [currentPortfolio]);

  // Initialize first data point
  useEffect(() => {
    setData([{ month: 0, label: "Hoy", value: startBalance }]);
  }, []);

  // Advance one step
  const advanceStep = useCallback(() => {
    if (currentStep >= totalSteps) {
      setPlaying(false);
      return;
    }

    const nextStep = currentStep + 1;
    const monthsDiff = filteredMonths[nextStep] - filteredMonths[currentStep];

    // Should an event happen? (40% chance per step)
    const eventHappens = Math.random() < 0.4 && nextStep > 1;
    const event = eventHappens ? pickRandom(marketEvents) : null;

    setData((prev) => {
      const lastValue = prev[prev.length - 1]?.value || startBalance;
      const monthlyReturn = getMonthlyReturn();
      let newValue = lastValue * Math.pow(1 + monthlyReturn, monthsDiff);

      if (event) {
        newValue *= event.impact;
      }

      newValue = Math.round(newValue * 100) / 100;
      const gain = ((newValue - startBalance) / startBalance) * 100;
      setTotalGain(Math.round(gain * 10) / 10);

      const point: TimePoint = {
        month: filteredMonths[nextStep],
        label: filteredLabels[nextStep],
        value: Math.round(newValue),
        event: event || undefined,
      };

      return [...prev, point];
    });

    if (event) {
      setCurrentEvent(event);
      setShowEvent(true);
      setPlaying(false); // Pause on events
      setBirdMsg(pickRandom(birdMessages[event.type]));

      // Show sell prompt on negative events
      if (event.type === "negative") {
        setShowSellPrompt(true);
      }
    } else {
      setBirdMsg(pickRandom(birdMessages.neutral));
    }

    setCurrentStep(nextStep);
  }, [currentStep, getMonthlyReturn]);

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
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Simulación</p>
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
          <p className="text-lg font-bold text-foreground">€{startBalance}</p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Valor actual</p>
          <p className={`text-lg font-bold ${isPositive ? "text-primary" : "text-destructive"}`}>
            €{lastValue.toLocaleString()}
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
              📈 {data.length > 1 ? timeLabels[currentStep] : "Hoy"}
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
                ? `🎉 ¡Tu nido creció! Ganaste €${(lastValue - startBalance).toFixed(0)} en 5 años`
                : `😅 Tu nido se encogió €${(startBalance - lastValue).toFixed(0)}. ¡Pero aprendiste!`
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
              onClick={() => setPlaying(!playing)}
              className="flex-1 bg-card text-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
              whileTap={{ scale: 0.95 }}
            >
              {playing ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> {currentStep === 0 ? "Empezar" : "Continuar"}</>}
            </motion.button>
            {!playing && (
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
