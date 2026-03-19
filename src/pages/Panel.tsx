import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useInstrumentStats } from "@/hooks/useMarketData";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/useUserProgress";
import CoachChat from "@/components/CoachChat";
import TimeSimulation from "@/components/game/TimeSimulation";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Investment } from "@/game/types";
import { availableInvestments } from "@/game/types";
import {
  LogOut, X, AlertTriangle, Inbox, Shield, TrendingUp, BarChart2,
  Building2, Leaf, Globe, Landmark, Zap, FastForward, MessageCircle, DollarSign, Info,
} from "lucide-react";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const CELESTE = "#5BB8F5";

// Map game IDs to DB instrument IDs
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
};
const allDbIds = Object.values(investmentToDbId);

function getInvestmentIcon(inv: Investment) {
  const name = inv.name.toLowerCase();
  if (name.includes("bond") || name.includes("treasury")) return <Landmark className="w-5 h-5" />;
  if (name.includes("real estate")) return <Building2 className="w-5 h-5" />;
  if (name.includes("energy") || name.includes("green")) return <Leaf className="w-5 h-5" />;
  if (name.includes("global") || name.includes("world")) return <Globe className="w-5 h-5" />;
  if (name.includes("tech") || name.includes("innovation")) return <Zap className="w-5 h-5" />;
  if (inv.type === "safe") return <Shield className="w-5 h-5" />;
  if (inv.type === "growth") return <TrendingUp className="w-5 h-5" />;
  return <BarChart2 className="w-5 h-5" />;
}

function getRiskColor(risk: number): string {
  if (risk <= 3) return "";
  if (risk <= 6) return "text-accent";
  return "text-destructive";
}

function getRiskInlineColor(risk: number): React.CSSProperties {
  if (risk <= 3) return { color: CELESTE };
  return {};
}

function getRiskBarColor(risk: number): string {
  if (risk <= 3) return CELESTE;
  if (risk <= 6) return "hsl(var(--accent))";
  return "hsl(var(--destructive))";
}

function getRiskLabel(risk: number): string {
  if (risk <= 30) return "Low";
  if (risk <= 60) return "Medium";
  return "High";
}

function riskWord(level: number): string {
  if (level <= 2) return "Very safe";
  if (level <= 4) return "Safe";
  if (level <= 6) return "Moderate";
  if (level <= 8) return "Risky";
  return "Very risky";
}

function getSuggestions(profile: string, active: Investment[]): Investment[] {
  const activeIds = new Set(active.map((i) => i.id));
  const activeTypes = new Set(active.map((i) => i.type));
  const pool = availableInvestments.filter((i) => !activeIds.has(i.id));
  if (pool.length === 0) return [];

  const riskRange = profile === "conservative" ? [1, 4]
    : profile === "growth" ? [5, 10]
    : [3, 7];

  const avgRisk = active.length
    ? active.reduce((s, i) => s + i.riskLevel, 0) / active.length
    : riskRange[0] + (riskRange[1] - riskRange[0]) / 2;
  const hasType = (t: string) => activeTypes.has(t as any);
  const slotsLeft = 4 - active.length;

  const scored = pool.map((inv) => {
    let score = 0;
    const inRange = inv.riskLevel >= riskRange[0] && inv.riskLevel <= riskRange[1];
    if (inRange) score += 30;
    else score -= Math.abs(inv.riskLevel - (riskRange[0] + riskRange[1]) / 2) * 3;
    if (!hasType(inv.type)) score += 25;
    if (active.length > 0) {
      if (avgRisk > 7 && inv.riskLevel <= 4) score += 20;
      if (avgRisk < 3 && inv.riskLevel >= 5) score += 15;
    }
    const efficiency = inv.annualReturn / Math.max(inv.riskLevel, 1);
    score += efficiency * 2;
    if (profile === "conservative" && inv.riskLevel <= 3) score += 10;
    if (profile === "balanced" && inv.riskLevel >= 3 && inv.riskLevel <= 6) score += 10;
    if (active.length === 0) {
      if (profile === "conservative" && inv.type === "safe") score += 20;
      if (profile === "balanced" && inv.type === "balanced") score += 20;
      if (profile === "growth" && inv.type === "growth") score += 20;
    }
    if (profile === "conservative" && inv.riskLevel >= 8) score -= 15;
    return { inv, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(slotsLeft + 1, 4)).map((s) => s.inv);
}

const tagDescriptions: Record<string, string> = {
  "AAA": "Máxima calidad crediticia",
  "GOV": "Bono gubernamental",
  "NESN": "Ticker: Nestlé",
  "NOVN": "Ticker: Novartis",
  "AAPL": "Ticker: Apple",
  "MSFT": "Ticker: Microsoft",
  "NVDA": "Ticker: NVIDIA",
  "LOGN": "Ticker: Logitech",
  "UBSG": "Ticker: UBS",
  "AMZN": "Ticker: Amazon",
  "HIGH RISK": "Riesgo elevado",
};

/* ---- Draggable investment card ---- */
function DraggableCard({
  inv, zone, onClick, onAsk, onSell, onInfo,
}: {
  inv: Investment; zone: "scouted" | "nest"; onClick: () => void; onAsk?: () => void; onSell?: () => void; onInfo?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${zone}-${inv.id}`,
    data: { inv, zone },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={zone === "scouted" ? onClick : undefined}
      className={`touch-none select-none transition-all ${isDragging ? "opacity-30 scale-95" : ""}`}
    >
      {zone === "nest" ? <NestCard inv={inv} onSell={onSell} onAsk={onAsk} onInfo={onInfo} /> : <ScoutedCard inv={inv} onAsk={onAsk} />}
    </div>
  );
}

function NestCard({ inv, overlay, onSell, onAsk, onInfo }: { inv: Investment; overlay?: boolean; onSell?: () => void; onAsk?: () => void; onInfo?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-sm ${overlay ? "shadow-lg rotate-2" : ""} cursor-grab active:cursor-grabbing`} style={overlay ? { boxShadow: `0 0 0 2px ${CELESTE}40` } : {}}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${CELESTE}18`, color: CELESTE }}>
          {getInvestmentIcon(inv)}
        </div>
        <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-foreground" style={nunito}>{inv.name}</p>
            {inv.flag && <span className="text-xs">{inv.flag}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground" style={nunito}>
              Riesgo <span style={{ color: getRiskBarColor(inv.riskLevel), fontWeight: 700 }}>{inv.riskLevel}/10</span>
            </span>
            <span className="text-xs" style={{ ...nunito, color: CELESTE, fontWeight: 700 }}>
              {inv.annualReturn}%/año
            </span>
          </div>
        </div>
        {!overlay && (
          <div
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </motion.div>
          </div>
        )}
      </div>

      {inv.tag && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full" style={nunito}>
            {inv.tag}
          </span>
          {tagDescriptions[inv.tag] && (
            <span className="text-[10px] text-muted-foreground" style={nunito}>{tagDescriptions[inv.tag]}</span>
          )}
        </div>
      )}

      {/* Expandable actions */}
      <AnimatePresence>
        {expanded && !overlay && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <motion.button
                onClick={(e) => { e.stopPropagation(); onSell?.(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive transition-colors"
                style={nunito}
                whileTap={{ scale: 0.95 }}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Vender
              </motion.button>
              <motion.button
                onClick={(e) => { e.stopPropagation(); onAsk?.(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ ...nunito, backgroundColor: `${CELESTE}15`, color: CELESTE }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Preguntar
              </motion.button>
              <motion.button
                onClick={(e) => { e.stopPropagation(); onInfo?.(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground transition-colors"
                style={nunito}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Detalle
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoutedCard({ inv, overlay, onAsk }: { inv: Investment; overlay?: boolean; onAsk?: () => void }) {
  return (
    <div className={`bg-card rounded-2xl p-3 shadow-sm border-2 border-dashed border-border ${overlay ? "-rotate-2" : ""} cursor-grab active:cursor-grabbing h-full`} style={overlay ? { boxShadow: `0 0 0 2px ${CELESTE}40`, borderColor: `${CELESTE}60` } : {}}>
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground flex-shrink-0">
          {getInvestmentIcon(inv)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground leading-snug" style={nunito}>{inv.name}</p>
          {inv.flag && <span className="text-[10px]">{inv.flag}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground" style={nunito}>Riesgo</span>
        <span className="text-[10px] font-bold" style={{ ...nunito, color: getRiskBarColor(inv.riskLevel) }}>{inv.riskLevel}/10</span>
        <span className="text-muted-foreground text-[10px]">·</span>
        <span className="text-[10px] font-bold" style={{ ...nunito, color: CELESTE }}>{inv.annualReturn}%</span>
      </div>
      {inv.tag && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${inv.tag === "HIGH RISK" ? "bg-destructive/10 text-destructive" : ""}`} style={{ ...nunito, ...(inv.tag !== "HIGH RISK" ? { backgroundColor: `${CELESTE}18`, color: CELESTE } : {}) }}>
            {inv.tag}
          </span>
          {tagDescriptions[inv.tag] && (
            <span className="text-[9px] text-muted-foreground" style={nunito}>{tagDescriptions[inv.tag]}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-end mt-1.5 gap-1">
        {!overlay && onAsk && (
          <span
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAsk(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold cursor-pointer"
            style={nunito}
          >?</span>
        )}
        {!overlay && <span className="text-sm font-bold" style={{ color: CELESTE }}>+</span>}
      </div>
    </div>
  );
}

/* ---- Droppable zone ---- */
function DropZone({ id, children, isOver }: { id: string; children: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef, isOver: over } = useDroppable({ id });
  const active = isOver ?? over;

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-0 rounded-3xl transition-all duration-200 p-1 -m-1 flex flex-col"
      style={active ? { backgroundColor: `${CELESTE}08`, outline: `2px dashed ${CELESTE}40` } : {}}
    >
      {children}
    </div>
  );
}

/* ---- Main Panel ---- */
const Panel = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { loadProgress, saveProgress } = useUserProgress();
  const [activePortfolio, setActivePortfolio] = useState<Investment[]>([]);
  const [profile, setProfile] = useState("balanced");
  const [balance, setBalance] = useState(1000);
  const [lastSimGain, setLastSimGain] = useState<number | null>(null);
  const [mascotMessage, setMascotMessage] = useState(
    "¡Arrastra una inversión a tu nido o tócala!"
  );
  const [draggedItem, setDraggedItem] = useState<{ inv: Investment; zone: string } | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInitQ, setCoachInitQ] = useState<string | undefined>(undefined);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simMonths, setSimMonths] = useState(12);
  const isMobile = useIsMobile();

  // Fetch real stats from DB for all instruments
  const { stats, loading: statsLoading } = useInstrumentStats(allDbIds);

  // Enrich investments with real DB data
  const enrichInvestment = useCallback((inv: Investment): Investment => {
    const dbId = investmentToDbId[inv.id];
    const real = dbId ? stats[dbId] : null;
    if (real) {
      return { ...inv, annualReturn: real.avgAnnualReturn, riskLevel: real.riskLevel };
    }
    return inv;
  }, [stats]);

  const enrichedPortfolio = useMemo(
    () => activePortfolio.map(enrichInvestment),
    [activePortfolio, enrichInvestment]
  );

  const enrichedAvailable = useMemo(
    () => availableInvestments.map(enrichInvestment),
    [enrichInvestment]
  );

  useEffect(() => {
    loadProgress().then((p) => {
      if (p) {
        setProfile(p.risk_profile);
        if (p.portfolio && p.portfolio.length > 0) setActivePortfolio(p.portfolio);
        if (p.simulation_result && p.simulation_result > 0) setBalance(p.simulation_result);
      }
    });
  }, [loadProgress]);

  const handleSimulationComplete = useCallback((finalBalance: number, gainPct: number) => {
    setBalance(finalBalance);
    setLastSimGain(gainPct);
    saveProgress({ simulation_result: finalBalance });
    if (gainPct > 0) {
      setMascotMessage(`¡Genial! Tu nido creció ${gainPct.toFixed(1)}% 🎉`);
    } else {
      setMascotMessage(`Tu nido bajó ${Math.abs(gainPct).toFixed(1)}%, pero aprendiste 💪`);
    }
  }, [saveProgress]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const suggestions = useMemo(() => getSuggestions(profile, enrichedPortfolio), [profile, enrichedPortfolio]);

  const totalRisk = enrichedPortfolio.length
    ? Math.round(enrichedPortfolio.reduce((s, i) => s + i.riskLevel, 0) / enrichedPortfolio.length * 10)
    : 0;

  
  const monthlyIncome = enrichedPortfolio.reduce((s, i) => s + Math.round((balance * i.annualReturn) / 100 / 12), 0);
  const avgReturn = enrichedPortfolio.length
    ? (enrichedPortfolio.reduce((s, i) => s + i.annualReturn, 0) / enrichedPortfolio.length).toFixed(1)
    : "0.0";

  const addInvestment = (inv: Investment) => {
    if (activePortfolio.length >= 4) {
      setMascotMessage("🪺 ¡Tu nido está lleno! Vende un huevo para hacer espacio.");
      return;
    }
    if (activePortfolio.find((i) => i.id === inv.id)) return;
    const next = [...activePortfolio, inv];
    setActivePortfolio(next);
    saveProgress({ portfolio: next });
    const newRisk = Math.round(next.reduce((s, i) => s + i.riskLevel, 0) / next.length * 10);
    if (newRisk > 70) setMascotMessage("🦉 ¡Cuidado! Compraste algo arriesgado. Tu nido tiembla un poco...");
    else if (newRisk < 20) setMascotMessage("🦉 ¡Buena compra! Un huevito muy seguro para tu nido.");
    else setMascotMessage("🦉 ¡Comprado! Buen ojo, ese huevo se ve prometedor.");
  };

  const removeInvestment = (id: string) => {
    const sold = activePortfolio.find(i => i.id === id);
    setActivePortfolio((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveProgress({ portfolio: next });
      return next;
    });
    if (sold) {
      setMascotMessage(`🦉 ¡Vendiste ${sold.name}! A veces soltar un huevo es la mejor decisión.`);
    } else {
      setMascotMessage("🦉 Huevo vendido. Tu nido se siente más ligero.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.data.current as { inv: Investment; zone: string });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);
    if (!over) return;
    const data = active.data.current as { inv: Investment; zone: string };
    const dropTarget = over.id as string;
    if (data.zone === "scouted" && dropTarget === "nest") addInvestment(data.inv);
    if (data.zone === "nest" && dropTarget === "scouted") removeInvestment(data.inv.id);
  };

  const handleSimulate = () => {
    saveProgress({ portfolio: activePortfolio });
    setSimulationOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase" style={nunito}>Mi Nido</p>
            <h1 className="text-2xl text-foreground mt-0.5" style={{ ...nunito, fontWeight: 900 }}>Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleSignOut}
              className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
            {isMobile ? (
              <Drawer open={coachOpen} onOpenChange={setCoachOpen}>
                <DrawerTrigger asChild>
                  <motion.button
                    className="w-12 h-12 rounded-full bg-card shadow-md overflow-hidden border-2" style={{ borderColor: `${CELESTE}40` }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <img src="/perspectiva1.png" alt="Coach" className="w-full h-full object-cover" />
                  </motion.button>
                </DrawerTrigger>
                <DrawerContent className="h-[80vh] p-0">
                  <CoachChat onClose={() => { setCoachOpen(false); setCoachInitQ(undefined); }} portfolio={enrichedPortfolio} onAddInvestment={(id) => { const inv = enrichedAvailable.find(i => i.id === id); if (inv) addInvestment(inv); }} onRemoveInvestment={(id) => removeInvestment(id)} initialQuestion={coachInitQ} />
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover open={coachOpen} onOpenChange={setCoachOpen}>
                <PopoverTrigger asChild>
                  <motion.button
                    className="w-12 h-12 rounded-full bg-card shadow-md overflow-hidden border-2" style={{ borderColor: `${CELESTE}40` }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <img src="/perspectiva1.png" alt="Coach" className="w-full h-full object-cover" />
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-[380px] h-[500px] p-0 rounded-2xl overflow-hidden">
                  <CoachChat onClose={() => { setCoachOpen(false); setCoachInitQ(undefined); }} portfolio={enrichedPortfolio} onAddInvestment={(id) => { const inv = enrichedAvailable.find(i => i.id === id); if (inv) addInvestment(inv); }} onRemoveInvestment={(id) => removeInvestment(id)} initialQuestion={coachInitQ} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Balance", value: `CHF ${balance.toLocaleString()}`, sub: lastSimGain !== null ? `${lastSimGain > 0 ? "+" : ""}${lastSimGain.toFixed(1)}% última sim.` : `+CHF ${monthlyIncome}/mes`, subStyle: { color: lastSimGain !== null ? (lastSimGain >= 0 ? CELESTE : "hsl(var(--destructive))") : CELESTE } },
            { label: "Riesgo", value: `${totalRisk}%`, valueStyle: totalRisk > 60 ? { color: "hsl(var(--destructive))" } : totalRisk > 30 ? {} : { color: CELESTE }, valueClass: totalRisk > 30 && totalRisk <= 60 ? "text-accent" : "", sub: totalRisk <= 30 ? "Bajo" : totalRisk <= 60 ? "Medio" : "Alto", subStyle: {} },
            { label: "Retorno", value: `${avgReturn}%`, valueStyle: { color: CELESTE }, sub: "Anual", subStyle: {} },
          ].map((stat, i) => (
            <motion.div key={stat.label} className="bg-card rounded-3xl p-3 shadow-sm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={nunito}>{stat.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${"valueClass" in stat ? stat.valueClass : "text-foreground"}`} style={{ ...nunito, ...("valueStyle" in stat ? stat.valueStyle : {}) }}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5" style={{ ...nunito, ...stat.subStyle }}>{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Mascot message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mascotMessage}
          className="px-5 pb-3 flex items-start gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <motion.img
            src="/perspectiva1.png"
            alt="Búho"
            className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm"
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />
          <div className="bg-card rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm flex-1">
            <p className="text-xs text-foreground leading-relaxed" style={nunito}>{mascotMessage}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* DnD Content */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* My Nest — always full width on top */}
          <DropZone id="nest">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide" style={nunito}>Mi Nido</h2>
              <span className="text-xs text-muted-foreground" style={nunito}>{enrichedPortfolio.length}/4</span>
            </div>
            {enrichedPortfolio.length === 0 ? (
              <div className="bg-card/50 rounded-3xl p-5 text-center border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                <Inbox className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground" style={nunito}>¡Tu nido está vacío!</p>
                <p className="text-xs text-muted-foreground" style={nunito}>Compra tu primera inversión tocándola abajo 👇</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {enrichedPortfolio.map((inv) => (
                    <motion.div key={inv.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} layout>
                      <DraggableCard
                        inv={inv}
                        zone="nest"
                        onClick={() => {}}
                        onSell={() => removeInvestment(inv.id)}
                        onAsk={() => { setCoachInitQ(`Tengo ${inv.name} en mi nido. ¿Es buena inversión? ¿Debería venderla o mantenerla?`); setCoachOpen(true); }}
                        onInfo={() => { setCoachInitQ(`Dame un análisis detallado de ${inv.name}: riesgo, retorno histórico, y perspectiva futura.`); setCoachOpen(true); }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </DropZone>

          {/* Scouted — horizontal scroll on mobile */}
          <DropZone id="scouted">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 mt-4" style={nunito}>🛒 Comprar</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
              {suggestions.map((inv) => (
                <div key={inv.id} className="flex-shrink-0" style={{ width: 200, scrollSnapAlign: "start" }}>
                  <DraggableCard inv={inv} zone="scouted" onClick={() => addInvestment(inv)} onAsk={() => { setCoachInitQ(`Explica brevemente qué es ${inv.name} y si encaja con mi perfil`); setCoachOpen(true); }} />
                </div>
              ))}
            </div>
          </DropZone>
        </div>

        <DragOverlay>
          {draggedItem ? (
            draggedItem.zone === "nest" ? <NestCard inv={draggedItem.inv} overlay /> : <ScoutedCard inv={draggedItem.inv} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bottom Actions */}
      <div className="px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        {/* Period selector */}
        <div className="flex gap-2 mb-3">
          {([
            { label: "3 meses", months: 3 },
            { label: "6 meses", months: 6 },
            { label: "1 año", months: 12 },
            { label: "5 años", months: 60 },
          ] as const).map((p) => (
            <button
              key={p.months}
              onClick={() => setSimMonths(p.months)}
              className="flex-1 py-2 rounded-2xl text-xs transition-all border-2"
              style={{
                ...nunito,
                fontWeight: 700,
                borderColor: simMonths === p.months ? CELESTE : "hsl(var(--border))",
                backgroundColor: simMonths === p.months ? CELESTE + "15" : "hsl(var(--card))",
                color: simMonths === p.months ? CELESTE : "hsl(var(--muted-foreground))",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <motion.button
          className="w-full py-4 rounded-3xl text-base shadow-lg transition-all flex items-center justify-center gap-2 text-white"
          style={{
            ...nunito,
            fontWeight: 900,
            background: activePortfolio.length === 0 ? "hsl(var(--muted))" : CELESTE,
            color: activePortfolio.length === 0 ? "hsl(var(--muted-foreground))" : "white",
            opacity: activePortfolio.length === 0 ? 0.4 : 1,
            cursor: activePortfolio.length === 0 ? "not-allowed" : "pointer",
          }}
          onClick={activePortfolio.length > 0 ? handleSimulate : undefined}
          whileHover={activePortfolio.length > 0 ? { scale: 1.02 } : {}}
          whileTap={activePortfolio.length > 0 ? { scale: 0.97 } : {}}
        >
          <FastForward className="w-4 h-4" />
          Simular {simMonths <= 6 ? `${simMonths} meses` : simMonths === 12 ? "1 año" : "5 años"}
        </motion.button>
        {activePortfolio.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2" style={nunito}>
            Agrega inversiones a tu nido para simular
          </p>
        )}
      </div>

      <AnimatePresence>
        {simulationOpen && (
          <TimeSimulation
            portfolio={enrichedPortfolio}
            initialMonths={simMonths}
            initialBalance={balance}
            onClose={() => setSimulationOpen(false)}
            onComplete={handleSimulationComplete}
            onSellInvestment={handleSimSell}
            onAskCoach={(q) => { setCoachInitQ(q); setCoachOpen(true); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  function handleSimSell(id: string) { removeInvestment(id); }
};

export default Panel;
