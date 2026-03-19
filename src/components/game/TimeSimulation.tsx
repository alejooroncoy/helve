import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FastForward,
  Pause,
  Play,
  TrendingUp,
  TrendingDown,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import type { Investment } from "@/game/types";
import { ASSET_CLASSES } from "@/game/types";
import { useMonthlyPrices } from "@/hooks/useMarketData";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import TimeSimulationCategoryCharts, {
  type CategoryTrendSnapshot,
  getCategoryColor,
} from "./TimeSimulationCategoryCharts";

const PRIMARY_COLOR = "hsl(var(--primary))";
const PRIMARY_SOFT = "hsl(var(--primary) / 0.12)";
const PRIMARY_BORDER = "hsl(var(--primary) / 0.28)";
const DANGER_COLOR = "hsl(var(--destructive))";
const DANGER_SOFT = "hsl(var(--destructive) / 0.12)";
const DANGER_BORDER = "hsl(var(--destructive) / 0.28)";
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

type EventDirection = "drop" | "surge" | "shake";

interface ScheduledAIEvent {
  step: number;
  investmentId: string;
  investmentName: string;
  riskLevel: number;
  direction: EventDirection;
}

const categoryToDbIds: Record<string, string[]> = {};
const assetClassByKey = Object.fromEntries(ASSET_CLASSES.map((cls) => [cls.key, cls]));
ASSET_CLASSES.forEach((cls) => {
  categoryToDbIds[cls.key] = cls.dbIds;
});

const ACTION_ICONS = {
  hold: ShieldCheck,
  sell: TrendingDown,
  buy: Zap,
};

const ACTION_COLORS = {
  hold: PRIMARY_COLOR,
  sell: DANGER_COLOR,
  buy: PRIMARY_COLOR,
};

const timeLabels = [
  "Hoy",
  "1 mes",
  "2 meses",
  "3 meses",
  "6 meses",
  "9 meses",
  "1 ano",
  "1.5 anos",
  "2 anos",
  "3 anos",
  "5 anos",
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
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seedFromString(input: string) {
  return input.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function seededUnit(input: string) {
  const seed = seedFromString(input);
  return (Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

function buildSyntheticSeries(key: string, months: number) {
  const synthetic = assetClassByKey[key as keyof typeof assetClassByKey]?.syntheticMonthly;
  if (!synthetic) return Array.from({ length: months + 1 }, () => 1);

  const series = [1];
  const seed = seedFromString(key);
  for (let month = 1; month <= months; month += 1) {
    const wave = Math.sin(seed * 0.01 + month * 1.31) * 0.6 + Math.cos(seed * 0.03 + month * 0.77) * 0.4;
    const monthlyReturn = synthetic.mean + wave * synthetic.vol * 0.35;
    series.push(series[month - 1] * Math.max(0.72, 1 + monthlyReturn));
  }

  return series;
}

function computeCategoryMultipliers(
  prices: Record<string, { date: string; price: number }[]>,
  investmentIds: string[],
  months: number[],
) {
  const maxMonth = Math.max(...months);
  const result: Record<string, number[]> = {};

  for (const investmentId of investmentIds) {
    const dbIds = categoryToDbIds[investmentId] || [];
    const available = dbIds.filter((id) => prices[id] && prices[id].length > 1);

    if (available.length > 0) {
      const series = available.map((instrumentId) => {
        const data = prices[instrumentId]!;
        const totalMonths = data.length;
        const startIdx = Math.max(0, totalMonths - maxMonth - 1);
        const basePrice = data[startIdx]?.price || data[0]?.price || 1;

        return months.map((month) => {
          const targetIdx = Math.min(startIdx + month, totalMonths - 1);
          const targetPrice = data[targetIdx]?.price || basePrice;
          return basePrice > 0 ? targetPrice / basePrice : 1;
        });
      });

      result[investmentId] = months.map((_, monthIndex) => {
        const total = series.reduce((sum, currentSeries) => sum + (currentSeries[monthIndex] ?? 1), 0);
        return total / series.length;
      });
      continue;
    }

    const syntheticSeries = buildSyntheticSeries(investmentId, maxMonth);
    result[investmentId] = months.map((month) => syntheticSeries[month] ?? 1);
  }

  return result;
}

function getEventCount(initialMonths: number, portfolio: Investment[]) {
  if (portfolio.length === 0) return 0;

  const avgRisk = portfolio.reduce((sum, investment) => sum + investment.riskLevel, 0) / portfolio.length;
  const normalizedRisk = clamp((avgRisk - 2) / 7, 0, 1);

  if (initialMonths <= 3) {
    return Math.random() < 0.28 + normalizedRisk * 0.37 ? 1 : 0;
  }

  if (initialMonths <= 6) {
    return Math.random() < 0.48 + normalizedRisk * 0.28 ? 1 : 0;
  }

  if (initialMonths <= 12) {
    return 1 + (normalizedRisk > 0.5 && portfolio.length > 1 ? 1 : 0);
  }

  if (initialMonths <= 24) {
    return Math.min(3, 2 + (normalizedRisk > 0.58 ? 1 : 0));
  }

  return Math.min(Math.min(5, portfolio.length || 1), 3 + Math.round(normalizedRisk * 2));
}

function pickEventSteps(totalSteps: number, eventCount: number) {
  const candidates = Array.from({ length: Math.max(totalSteps - 1, 0) }, (_, index) => index + 1);
  if (eventCount === 0 || candidates.length === 0) return [];
  if (eventCount >= candidates.length) return candidates;

  const chosen = new Set<number>();
  const result: number[] = [];

  for (let index = 0; index < eventCount; index += 1) {
    const target = ((index + 1) * (candidates.length + 1)) / (eventCount + 1);
    const preferred = Math.round(target);
    const attempts = [preferred, preferred - 1, preferred + 1, preferred - 2, preferred + 2];
    const picked = attempts.find((step) => candidates.includes(step) && !chosen.has(step));

    if (picked) {
      chosen.add(picked);
      result.push(picked);
    }
  }

  return result.sort((a, b) => a - b);
}

function pickWeightedInvestment(portfolio: Investment[], usedIds: Set<string>, iteration: number) {
  const uniquePool = portfolio.filter((investment) => !usedIds.has(investment.id));
  const pool = uniquePool.length > 0 ? uniquePool : portfolio;
  const totalWeight = pool.reduce((sum, investment) => sum + Math.max(1, investment.riskLevel), 0);
  const deterministicRoll = Math.abs(seededUnit(`${pool.map((item) => item.id).join("-")}-${iteration}`));
  let cursor = deterministicRoll * totalWeight;

  for (const investment of pool) {
    cursor -= Math.max(1, investment.riskLevel);
    if (cursor <= 0) return investment;
  }

  return pool[pool.length - 1];
}

function pickEventDirection(investmentId: string, riskLevel: number, step: number): EventDirection {
  const roll = Math.abs(seededUnit(`${investmentId}-${step}`));

  if (riskLevel >= 7) {
    if (roll < 0.42) return "drop";
    if (roll < 0.76) return "shake";
    return "surge";
  }

  if (riskLevel >= 4) {
    if (roll < 0.38) return "drop";
    if (roll < 0.68) return "shake";
    return "surge";
  }

  if (roll < 0.34) return "drop";
  if (roll < 0.56) return "shake";
  return "surge";
}

function buildAIEventPlan(portfolio: Investment[], initialMonths: number, totalSteps: number, translateName: (id: string) => string) {
  const eventCount = getEventCount(initialMonths, portfolio);
  const steps = pickEventSteps(totalSteps, eventCount);
  const usedIds = new Set<string>();

  return steps.map((step, index) => {
    const investment = pickWeightedInvestment(portfolio, usedIds, index + step);
    usedIds.add(investment.id);

    return {
      step,
      investmentId: investment.id,
      investmentName: translateName(investment.id),
      riskLevel: investment.riskLevel,
      direction: pickEventDirection(investment.id, investment.riskLevel, step),
    } satisfies ScheduledAIEvent;
  });
}

function buildFallbackScenario(event: ScheduledAIEvent, language: string): AIScenario {
  const isSpanish = language === "es";
  const categoryName = event.investmentName;

  if (event.direction === "drop") {
    return {
      title: isSpanish ? `${categoryName} cae hoy` : `${categoryName} drops today`,
      description: isSpanish
        ? `${categoryName} recibe presión fuerte y ahora vale menos. Tu nido está expuesto aquí, así que toca decidir.`
        : `${categoryName} is under pressure and suddenly trades lower. Your nest is exposed here, so you need to decide.`,
      options: [
        {
          action: "hold",
          label: isSpanish ? "No tocar" : "Do nothing",
          is_best: false,
          feedback_good: "",
          feedback_bad: isSpanish
            ? `Mantener sin pensar puede salir caro si no entiendes el riesgo de esta categoría. La próxima vez compara si la caída es una oportunidad real o una alerta.`
            : `Holding without a clear reason can be costly if you do not understand this category's risk. Next time, decide whether the drop is an opportunity or a warning sign.`,
        },
        {
          action: "sell",
          label: isSpanish ? "Vender ahora" : "Sell now",
          is_best: false,
          feedback_good: "",
          feedback_bad: isSpanish
            ? `Vender por miedo cristaliza la caída y corta la posibilidad de recuperación. Antes de salir, piensa si el cambio afecta de verdad a tu tesis de largo plazo.`
            : `Selling out of fear locks in the drop and cuts off recovery potential. Before exiting, ask whether the change really breaks your long-term thesis.`,
        },
        {
          action: "buy",
          label: isSpanish ? "Comprar más" : "Buy more",
          is_best: true,
          feedback_good: isSpanish
            ? `Buena lectura. Si el precio cae pero el activo sigue teniendo sentido para tu estrategia, comprar más barato puede mejorar tu resultado futuro.`
            : `Good read. If the price falls but the asset still fits your strategy, buying cheaper can improve your future outcome.`,
          feedback_bad: "",
        },
      ],
    };
  }

  if (event.direction === "surge") {
    return {
      title: isSpanish ? `${categoryName} se dispara` : `${categoryName} jumps fast`,
      description: isSpanish
        ? `${categoryName} sube con fuerza y todo el mundo mira esta categoría. La pregunta es si perseguir el movimiento o mantener la calma.`
        : `${categoryName} is rallying hard and everyone is watching it. The question is whether to chase the move or stay calm.`,
      options: [
        {
          action: "hold",
          label: isSpanish ? "Mantener" : "Hold steady",
          is_best: true,
          feedback_good: isSpanish
            ? `Correcto. No hace falta perseguir cada subida cuando ya tienes exposición. Mantener disciplina evita comprar por emoción.`
            : `Correct. You do not need to chase every rally when you already have exposure. Staying disciplined helps you avoid emotional buying.`,
          feedback_bad: "",
        },
        {
          action: "sell",
          label: isSpanish ? "Tomar ganancias" : "Take profits",
          is_best: false,
          feedback_good: "",
          feedback_bad: isSpanish
            ? `Tomar ganancias no siempre es un error, pero aquí te sacó demasiado pronto. La lección es no cortar una tendencia sana por ansiedad.`
            : `Taking profits is not always wrong, but here it got you out too early. The lesson is not to cut a healthy trend just because you feel anxious.`,
        },
        {
          action: "buy",
          label: isSpanish ? "Comprar arriba" : "Buy the rally",
          is_best: false,
          feedback_good: "",
          feedback_bad: isSpanish
            ? `Comprar después de una subida fuerte puede hacer que entres tarde y con más riesgo. Mejor respira y revisa si el movimiento sigue teniendo valor.`
            : `Buying after a sharp rally can leave you entering late and taking more risk. Better to pause and check whether the move still offers value.`,
        },
      ],
    };
  }

  return {
    title: isSpanish ? `${categoryName} entra en tensión` : `${categoryName} turns volatile`,
    description: isSpanish
      ? `${categoryName} se mueve con nerviosismo y el mercado no sabe hacia dónde irá. Tu decisión ahora afectará el resto del vuelo.`
      : `${categoryName} is moving nervously and the market is unsure where it goes next. Your choice now will affect the rest of the flight.`,
    options: [
      {
        action: "hold",
        label: isSpanish ? "Mantener plan" : "Stay the course",
        is_best: true,
        feedback_good: isSpanish
          ? `Bien hecho. Cuando hay ruido pero no cambia la historia de fondo, mantener el plan suele ser la mejor defensa.`
          : `Well done. When there is noise but the underlying story has not changed, sticking to the plan is often the best defense.`,
        feedback_bad: "",
      },
      {
        action: "sell",
        label: isSpanish ? "Salir por miedo" : "Sell from fear",
        is_best: false,
        feedback_good: "",
        feedback_bad: isSpanish
          ? `Salir solo por nervios te puede dejar fuera de una recuperación. La próxima vez distingue entre volatilidad y deterioro real.`
          : `Exiting just because you are nervous can leave you out of a recovery. Next time, separate volatility from real deterioration.`,
      },
      {
        action: "buy",
        label: isSpanish ? "Comprar más ya" : "Buy more now",
        is_best: false,
        feedback_good: "",
        feedback_bad: isSpanish
          ? `Comprar de inmediato en un mercado confuso puede subir tu riesgo sin mejorar el aprendizaje. Primero entiende por qué se mueve la categoría.`
          : `Buying immediately in a confused market can raise your risk without improving the lesson. First understand why the category is moving.`,
      },
    ],
  };
}

function getImpactMessage(action: AIScenarioOption["action"], categoryName: string, language: string) {
  if (language === "es") {
    if (action === "buy") return `${categoryName} pesa más en tu nido desde ahora.`;
    if (action === "sell") return `${categoryName} pesa menos en tu nido desde ahora.`;
    return `${categoryName} mantiene su peso en tu nido.`;
  }

  if (action === "buy") return `${categoryName} now has more weight in your nest.`;
  if (action === "sell") return `${categoryName} now has less weight in your nest.`;
  return `${categoryName} keeps the same weight in your nest.`;
}

async function fetchAIScenario(
  portfolio: Investment[],
  balance: number,
  monthLabel: string,
  language: string,
  event: ScheduledAIEvent,
): Promise<AIScenario | null> {
  try {
    const { data, error } = await supabase.functions.invoke("sim-event", {
      body: {
        portfolio,
        balance,
        monthLabel,
        language,
        focusCategory: event.investmentId,
        focusCategoryLabel: event.investmentName,
        focusDirection: event.direction,
        focusRiskLevel: event.riskLevel,
      },
    });

    if (error || !data || !data.options) return null;
    return data as AIScenario;
  } catch {
    return null;
  }
}

export default function TimeSimulation({
  portfolio,
  initialMonths = 12,
  initialBalance = 1000,
  onClose,
  onComplete,
  onSellInvestment,
  onAskCoach,
}: TimeSimulationProps) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState<TimePoint[]>([]);
  const [birdMsg, setBirdMsg] = useState(t("timeSim.letsStart"));
  const [totalGain, setTotalGain] = useState(0);
  const [currentPortfolio] = useState(portfolio);
  const [aiScenario, setAiScenario] = useState<AIScenario | null>(null);
  const [activeAIEvent, setActiveAIEvent] = useState<ScheduledAIEvent | null>(null);
  const [showAIEvent, setShowAIEvent] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ text: string; isGood: boolean; impact: string } | null>(null);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [loadingDecisionStep, setLoadingDecisionStep] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiScenarioCache = useRef<Record<number, AIScenario | null>>({});
  const aiFetchingRef = useRef<Set<number>>(new Set());
  const decisionMultiplier = useRef(1);
  const categoryExposure = useRef<Record<string, number>>({});
  const aiDecisions = useRef<Array<{ step: number; action: string; isGood: boolean; investmentId: string }>>([]);

  const dbIds = useMemo(
    () => currentPortfolio.flatMap((investment) => categoryToDbIds[investment.id] || []).filter(Boolean),
    [currentPortfolio],
  );
  const { prices, loading: pricesLoading } = useMonthlyPrices(dbIds);

  const filteredIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < timeMonths.length; i += 1) {
      if (timeMonths[i] <= initialMonths) indices.push(i);
    }
    return indices;
  }, [initialMonths]);
  const filteredMonths = filteredIndices.map((index) => timeMonths[index]);
  const filteredLabels = filteredIndices.map((index) => timeLabels[index]);
  const totalSteps = filteredMonths.length - 1;

  const aiEventPlan = useMemo(
    () =>
      buildAIEventPlan(currentPortfolio, initialMonths, totalSteps, (investmentId) =>
        t(`allocation.classes.${investmentId}`),
      ),
    [currentPortfolio, initialMonths, totalSteps, t],
  );

  const aiEventMap = useMemo(
    () => Object.fromEntries(aiEventPlan.map((event) => [event.step, event])),
    [aiEventPlan],
  );

  const categoryMultipliers = useMemo(() => {
    if (pricesLoading) return null;
    return computeCategoryMultipliers(prices, currentPortfolio.map((investment) => investment.id), filteredMonths);
  }, [prices, pricesLoading, currentPortfolio, filteredMonths]);

  const categorySnapshots = useMemo<CategoryTrendSnapshot[]>(() => {
    if (!categoryMultipliers) return [];

    return currentPortfolio.map((investment) => {
      const series = categoryMultipliers[investment.id] || filteredMonths.map(() => 1);
      const first = series[0] || 1;
      const last = series[series.length - 1] || first;
      const changePct = ((last / first) - 1) * 100;

      return {
        id: investment.id,
        label: t(`allocation.classes.${investment.id}`),
        riskLevel: investment.riskLevel,
        changePct,
        points: series.map((value, index) => ({
          index,
          value: Math.round(value * 1000) / 10,
        })),
      };
    });
  }, [categoryMultipliers, currentPortfolio, filteredMonths, t]);

  const startBalance = initialBalance;

  useEffect(() => {
    categoryExposure.current = currentPortfolio.reduce<Record<string, number>>((accumulator, investment) => {
      accumulator[investment.id] = categoryExposure.current[investment.id] ?? 1;
      return accumulator;
    }, {});
  }, [currentPortfolio]);

  useEffect(() => {
    setBirdMsg(t("timeSim.letsStart"));
    setData([{ month: 0, label: t("timeSim.today"), value: startBalance }]);
  }, [startBalance, t]);

  useEffect(() => {
    aiScenarioCache.current = {};
    aiFetchingRef.current.clear();
  }, [aiEventPlan, i18n.language]);

  const calculatePortfolioValueAtStep = useCallback(
    (step: number) => {
      if (!categoryMultipliers || currentPortfolio.length === 0) return startBalance;

      let weighted = 0;
      let totalWeight = 0;

      for (const investment of currentPortfolio) {
        const exposure = categoryExposure.current[investment.id] ?? 1;
        const multiplier = categoryMultipliers[investment.id]?.[step] ?? 1;
        weighted += multiplier * exposure;
        totalWeight += exposure;
      }

      const portfolioMultiplier = totalWeight > 0 ? weighted / totalWeight : 1;
      return Math.round(startBalance * portfolioMultiplier * decisionMultiplier.current * 100) / 100;
    },
    [categoryMultipliers, currentPortfolio, startBalance],
  );

  const ensureScenario = useCallback(
    async (event: ScheduledAIEvent, balance: number) => {
      if (aiScenarioCache.current[event.step]) return aiScenarioCache.current[event.step];
      if (aiFetchingRef.current.has(event.step)) return null;

      aiFetchingRef.current.add(event.step);
      const scenario =
        (await fetchAIScenario(currentPortfolio, balance, filteredLabels[event.step] || "", i18n.language, event)) ||
        buildFallbackScenario(event, i18n.language);
      aiScenarioCache.current[event.step] = scenario;
      aiFetchingRef.current.delete(event.step);
      return scenario;
    },
    [currentPortfolio, filteredLabels, i18n.language],
  );

  useEffect(() => {
    for (const event of aiEventPlan) {
      const prefetchAt = Math.max(0, event.step - 1);
      const lastValue = data[data.length - 1]?.value || startBalance;

      if (currentStep >= prefetchAt && !aiScenarioCache.current[event.step] && !aiFetchingRef.current.has(event.step)) {
        void ensureScenario(event, lastValue);
      }
    }
  }, [currentStep, aiEventPlan, data, ensureScenario, startBalance]);

  const advanceStep = useCallback(() => {
    if (currentStep >= totalSteps || !categoryMultipliers) {
      setPlaying(false);
      return;
    }

    const nextStep = currentStep + 1;
    const newValue = calculatePortfolioValueAtStep(nextStep);
    const gain = ((newValue - startBalance) / startBalance) * 100;
    setTotalGain(Math.round(gain * 10) / 10);

    const point: TimePoint = {
      month: filteredMonths[nextStep],
      label: filteredLabels[nextStep],
      value: Math.round(newValue),
    };
    setData((prev) => [...prev, point]);

    const scheduledEvent = aiEventMap[nextStep];
    if (scheduledEvent) {
      setCurrentStep(nextStep);
      setPlaying(false);
      setLoadingDecisionStep(nextStep);
      setBirdMsg(
        i18n.language === "es"
          ? `${scheduledEvent.investmentName} está moviéndose fuerte...`
          : `${scheduledEvent.investmentName} is moving sharply...`,
      );

      void ensureScenario(scheduledEvent, newValue).then((scenario) => {
        setLoadingDecisionStep(null);
        if (scenario) {
          setActiveAIEvent(scheduledEvent);
          setAiScenario(scenario);
          setShowAIEvent(true);
        }
      });
      return;
    }

    const previousValue = data[data.length - 1]?.value || startBalance;
    const stepReturn = previousValue > 0 ? newValue / previousValue - 1 : 0;
    const msgType = stepReturn > 0.02 ? "positive" : stepReturn < -0.02 ? "negative" : "neutral";
    setBirdMsg(pickRandom(birdMessages[msgType]));
    setCurrentStep(nextStep);
  }, [
    currentStep,
    totalSteps,
    categoryMultipliers,
    calculatePortfolioValueAtStep,
    startBalance,
    filteredMonths,
    filteredLabels,
    aiEventMap,
    i18n.language,
    ensureScenario,
    data,
  ]);

  const handleAIChoice = (option: AIScenarioOption) => {
    if (!activeAIEvent) return;

    const exposureShift = 0.1 + activeAIEvent.riskLevel * 0.015;
    const currentExposure = categoryExposure.current[activeAIEvent.investmentId] ?? 1;

    if (option.action === "buy") {
      categoryExposure.current[activeAIEvent.investmentId] = clamp(currentExposure * (1 + exposureShift), 0.4, 1.9);
    } else if (option.action === "sell") {
      categoryExposure.current[activeAIEvent.investmentId] = clamp(currentExposure * (1 - exposureShift), 0.35, 1.9);
    }

    const decisionShift = 0.02 + activeAIEvent.riskLevel * 0.006;
    decisionMultiplier.current *= option.is_best ? 1 + decisionShift : Math.max(0.8, 1 - decisionShift * 1.35);

    aiDecisions.current.push({
      step: activeAIEvent.step,
      action: option.action,
      isGood: option.is_best,
      investmentId: activeAIEvent.investmentId,
    });

    setShowAIEvent(false);
    setAiFeedback({
      text: option.is_best ? option.feedback_good : option.feedback_bad,
      isGood: option.is_best,
      impact: getImpactMessage(option.action, activeAIEvent.investmentName, i18n.language),
    });
    setShowAIFeedback(true);
  };

  const dismissAIFeedback = () => {
    setShowAIFeedback(false);
    setAiFeedback(null);
    setAiScenario(null);
    setActiveAIEvent(null);
    setPlaying(true);
  };

  useEffect(() => {
    if (playing && currentStep < totalSteps && loadingDecisionStep === null) {
      intervalRef.current = setTimeout(advanceStep, 1300);
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [playing, currentStep, totalSteps, advanceStep, loadingDecisionStep]);

  const isFinished = currentStep >= totalSteps;
  const lastValue = data[data.length - 1]?.value || startBalance;
  const isPositive = lastValue >= startBalance;
  const totalDecisions = aiDecisions.current.length;
  const goodDecisions = aiDecisions.current.filter((decision) => decision.isGood).length;
  const decisionsByStep = new Map(aiDecisions.current.map((decision) => [decision.step, decision]));
  const showCategorySnapshots = currentStep === 0 && !playing && !showAIEvent && !showAIFeedback;

  if (pricesLoading) {
    return (
      <motion.div
        className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY_COLOR }} />
        <p className="text-sm text-muted-foreground font-medium" style={nunito}>
          {t("timeSim.loadingMarket")}
        </p>
      </motion.div>
    );
  }

  const periodLabel =
    initialMonths <= 3
      ? i18n.language === "es"
        ? "3 meses"
        : "3 months"
      : initialMonths <= 6
        ? i18n.language === "es"
          ? "6 meses"
          : "6 months"
        : initialMonths === 12
          ? i18n.language === "es"
            ? "1 año"
            : "1 year"
          : i18n.language === "es"
            ? "5 años"
            : "5 years";

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
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
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase" style={nunito}>
            {t("timeSim.invested")}
          </p>
          <p className="text-base font-bold text-foreground" style={nunito}>
            CHF {startBalance}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase" style={nunito}>
            {t("timeSim.currentValue")}
          </p>
          <p
            className="text-base font-bold"
            style={{ ...nunito, color: isPositive ? PRIMARY_COLOR : DANGER_COLOR }}
          >
            CHF {lastValue.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground uppercase" style={nunito}>
            {t("timeSim.gain")}
          </p>
          <p
            className="text-base font-bold flex items-center justify-center gap-1"
            style={{ ...nunito, color: isPositive ? PRIMARY_COLOR : DANGER_COLOR }}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {totalGain > 0 ? "+" : ""}
            {totalGain}%
          </p>
        </div>
      </div>

      <div className="px-5 flex-1 min-h-0 space-y-3">
        {showCategorySnapshots && (
          <TimeSimulationCategoryCharts
            title={t("timeSim.categorySnapshots")}
            subtitle={t("timeSim.categorySnapshotsHint")}
            riskLabel={(level) => t("timeSim.riskLabel", { level })}
            items={categorySnapshots}
          />
        )}

        <div className="bg-card rounded-3xl p-4 shadow-sm h-full flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 gap-3">
            <p className="text-xs font-bold text-foreground" style={nunito}>
              {data.length > 1 ? filteredLabels[currentStep] : t("timeSim.today")}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {currentPortfolio.map((investment) => (
                <span
                  key={investment.id}
                  className="text-[10px] font-semibold rounded-full px-2 py-1"
                  style={{
                    color: "hsl(var(--foreground))",
                    backgroundColor: "hsl(var(--muted))",
                  }}
                >
                  {t(`allocation.classes.${investment.id}`)}
                </span>
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
                  stroke={PRIMARY_COLOR}
                  strokeWidth={3}
                  dot={false}
                  animationDuration={500}
                />
                {aiEventPlan.map((event) => {
                  const point = data[event.step];
                  if (!point) return null;
                  const resolvedDecision = decisionsByStep.get(event.step);

                  return (
                    <ReferenceDot
                      key={`${event.step}-${event.investmentId}`}
                      x={point.label}
                      y={point.value}
                      r={4.5}
                      fill={
                        resolvedDecision
                          ? resolvedDecision.isGood
                            ? PRIMARY_COLOR
                            : DANGER_COLOR
                          : "hsl(var(--muted-foreground))"
                      }
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="px-5 py-3">
        <motion.div
          key={birdMsg}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: `2px solid ${PRIMARY_BORDER}` }}
          >
            <img src="/face.png" alt="Coach" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-foreground font-medium flex-1" style={nunito}>
            {birdMsg}
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {loadingDecisionStep !== null && !showAIEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center px-6"
          >
            <div className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full text-center">
              <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: PRIMARY_COLOR }} />
              <p className="text-sm text-foreground font-semibold" style={nunito}>
                {t("timeSim.preparingDecision")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAIEvent && aiScenario && activeAIEvent && (
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
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: PRIMARY_SOFT }}
              >
                <AlertTriangle className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
              </div>

              <div className="mb-3 flex items-center justify-center gap-2 flex-wrap">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  {activeAIEvent.investmentName}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY_COLOR }}
                >
                  {t("timeSim.riskLabel", { level: activeAIEvent.riskLevel })}
                </span>
              </div>

              <h2 className="text-lg font-bold text-foreground mb-1" style={nunito}>
                {aiScenario.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-5" style={nunito}>
                {aiScenario.description}
              </p>

              <div className="space-y-2.5">
                {aiScenario.options.map((option) => {
                  const Icon = ACTION_ICONS[option.action];
                  const color = ACTION_COLORS[option.action];
                  return (
                    <motion.button
                      key={option.action}
                      onClick={() => handleAIChoice(option)}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border"
                      style={{ ...nunito, borderColor: option.action === "sell" ? DANGER_BORDER : PRIMARY_BORDER, color }}
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
                style={{ backgroundColor: aiFeedback.isGood ? PRIMARY_SOFT : DANGER_SOFT }}
              >
                {aiFeedback.isGood ? (
                  <ShieldCheck className="w-7 h-7" style={{ color: PRIMARY_COLOR }} />
                ) : (
                  <ShieldAlert className="w-7 h-7" style={{ color: DANGER_COLOR }} />
                )}
              </div>
              <h3
                className="text-base font-bold mb-2"
                style={{
                  ...nunito,
                  color: aiFeedback.isGood ? PRIMARY_COLOR : DANGER_COLOR,
                }}
              >
                {aiFeedback.isGood
                  ? i18n.language === "es"
                    ? "Buena decisión"
                    : "Great call"
                  : i18n.language === "es"
                    ? "No te preocupes"
                    : "Don't worry"}
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed" style={nunito}>
                {aiFeedback.text}
              </p>
              <div
                className="rounded-2xl px-4 py-3 text-xs font-semibold mb-5"
                style={{
                  backgroundColor: aiFeedback.isGood ? PRIMARY_SOFT : DANGER_SOFT,
                  color: aiFeedback.isGood ? PRIMARY_COLOR : DANGER_COLOR,
                }}
              >
                {aiFeedback.impact}
              </div>
              <motion.button
                onClick={dismissAIFeedback}
                className="w-full py-3.5 rounded-2xl text-sm font-bold"
                style={{ ...nunito, backgroundColor: PRIMARY_COLOR, color: "hsl(var(--primary-foreground))" }}
                whileTap={{ scale: 0.97 }}
              >
                {i18n.language === "es" ? "Continuar" : "Continue"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 pb-6 pt-2">
        {isFinished ? (
          <div className="space-y-2">
            {totalDecisions > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-3 py-2.5 rounded-2xl text-xs font-bold"
                style={{ ...nunito, backgroundColor: PRIMARY_SOFT, color: PRIMARY_COLOR }}
              >
                <ShieldCheck className="w-4 h-4" />
                {t("timeSim.decisionSummary", { good: goodDecisions, total: totalDecisions })}
              </motion.div>
            )}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-3 rounded-2xl text-sm font-bold"
              style={{
                ...nunito,
                backgroundColor: isPositive ? PRIMARY_SOFT : DANGER_SOFT,
                color: isPositive ? PRIMARY_COLOR : DANGER_COLOR,
              }}
            >
              {isPositive
                ? t("timeSim.nestGrew", { amount: (lastValue - startBalance).toFixed(0), period: periodLabel })
                : t("timeSim.nestShrunk", { amount: (startBalance - lastValue).toFixed(0), period: periodLabel })}
            </motion.div>
            <motion.button
              onClick={() => {
                const finalVal = data.length > 0 ? data[data.length - 1].value : startBalance;
                onComplete?.(Math.round(finalVal), totalGain);
                onClose();
              }}
              className="w-full py-4 rounded-3xl text-base font-bold"
              style={{ ...nunito, backgroundColor: PRIMARY_COLOR, color: "hsl(var(--primary-foreground))" }}
              whileTap={{ scale: 0.97 }}
            >
              {t("timeSim.backToNest")}
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-3">
            <motion.button
              onClick={() => categoryMultipliers && setPlaying(!playing)}
              className="flex-1 bg-card text-foreground py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
              style={{ ...nunito, opacity: categoryMultipliers ? 1 : 0.5 }}
              whileTap={{ scale: 0.95 }}
            >
              {playing ? (
                <>
                  <Pause className="w-4 h-4" /> {t("timeSim.pause")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {currentStep === 0 ? t("timeSim.start") : t("timeSim.resume")}
                </>
              )}
            </motion.button>
            {!playing && categoryMultipliers && loadingDecisionStep === null && (
              <motion.button
                onClick={advanceStep}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                style={{ ...nunito, backgroundColor: PRIMARY_COLOR, color: "hsl(var(--primary-foreground))" }}
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
