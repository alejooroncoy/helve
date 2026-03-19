import { useState, useMemo, useEffect, useCallback } from "react";
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
  Building2, Leaf, Globe, Landmark, Zap, FastForward,
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

/* ---- Draggable investment card ---- */
function DraggableCard({
  inv, zone, onClick, onAsk,
}: {
  inv: Investment; zone: "scouted" | "nest"; onClick: () => void; onAsk?: () => void;
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
      onClick={onClick}
      className={`touch-none select-none transition-all ${isDragging ? "opacity-30 scale-95" : ""}`}
    >
      {zone === "nest" ? <NestCard inv={inv} /> : <ScoutedCard inv={inv} onAsk={onAsk} />}
    </div>
  );
}

function NestCard({ inv, overlay }: { inv: Investment; overlay?: boolean }) {
  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-sm ${overlay ? "shadow-lg rotate-2" : ""} cursor-grab active:cursor-grabbing`} style={overlay ? { boxShadow: `0 0 0 2px ${CELESTE}40` } : {}}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${CELESTE}18`, color: CELESTE }}>
          {getInvestmentIcon(inv)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate" style={nunito}>{inv.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5" style={nunito}>
            {riskWord(inv.riskLevel)} · Earns ~{inv.annualReturn}% per year
          </p>
        </div>
        {!overlay && (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <X className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-medium w-8" style={nunito}>Risk</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${inv.riskLevel * 10}%`, backgroundColor: getRiskBarColor(inv.riskLevel) }}
          />
        </div>
        <span className={`text-[10px] font-bold ${getRiskColor(inv.riskLevel)}`} style={{ ...nunito, ...getRiskInlineColor(inv.riskLevel) }}>{inv.riskLevel}/10</span>
      </div>
      {inv.tag && (
        <span className="inline-block mt-2 text-[10px] font-bold bg-accent/15 text-accent px-2.5 py-0.5 rounded-full" style={nunito}>
          {inv.tag}
        </span>
      )}
    </div>
  );
}

function ScoutedCard({ inv, overlay, onAsk }: { inv: Investment; overlay?: boolean; onAsk?: () => void }) {
  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-sm border-2 border-dashed border-border ${overlay ? "-rotate-2" : ""} cursor-grab active:cursor-grabbing`} style={overlay ? { boxShadow: `0 0 0 2px ${CELESTE}40`, borderColor: `${CELESTE}60` } : {}}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground flex-shrink-0">
          {getInvestmentIcon(inv)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate" style={nunito}>{inv.name} {inv.flag || ""}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5" style={nunito}>
            {riskWord(inv.riskLevel)} · Earns ~{inv.annualReturn}% per year
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!overlay && onAsk && (
            <span
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAsk(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-accent/20 transition-colors"
              style={nunito}
            >
              ?
            </span>
          )}
          {!overlay && <span className="text-base font-bold" style={{ color: CELESTE }}>+</span>}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-medium w-8" style={nunito}>Risk</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${inv.riskLevel * 10}%`, backgroundColor: getRiskBarColor(inv.riskLevel) }}
          />
        </div>
        <span className={`text-[10px] font-bold ${getRiskColor(inv.riskLevel)}`} style={{ ...nunito, ...getRiskInlineColor(inv.riskLevel) }}>{inv.riskLevel}/10</span>
      </div>
      {inv.tag && (
        <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${inv.tag === "HIGH RISK" ? "bg-destructive/10 text-destructive" : ""}`} style={{ ...nunito, ...(inv.tag !== "HIGH RISK" ? { backgroundColor: `${CELESTE}18`, color: CELESTE } : {}) }}>
          {inv.tag === "HIGH RISK" && <AlertTriangle className="w-3 h-3" />}
          {inv.tag}
        </span>
      )}
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
  const [mascotMessage, setMascotMessage] = useState(
    "Drag an investment into your nest — or just tap it!"
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
      }
    });
  }, [loadProgress]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const suggestions = useMemo(() => getSuggestions(profile, enrichedPortfolio), [profile, enrichedPortfolio]);

  const totalRisk = enrichedPortfolio.length
    ? Math.round(enrichedPortfolio.reduce((s, i) => s + i.riskLevel, 0) / enrichedPortfolio.length * 10)
    : 0;

  const balance = 1000;
  const monthlyIncome = enrichedPortfolio.reduce((s, i) => s + Math.round((balance * i.annualReturn) / 100 / 12), 0);
  const avgReturn = enrichedPortfolio.length
    ? (enrichedPortfolio.reduce((s, i) => s + i.annualReturn, 0) / enrichedPortfolio.length).toFixed(1)
    : "0.0";

  const addInvestment = (inv: Investment) => {
    if (activePortfolio.length >= 4) {
      setMascotMessage("Your nest is full! Remove one egg to make room.");
      return;
    }
    if (activePortfolio.find((i) => i.id === inv.id)) return;
    const next = [...activePortfolio, inv];
    setActivePortfolio(next);
    saveProgress({ portfolio: next });
    const newRisk = Math.round(next.reduce((s, i) => s + i.riskLevel, 0) / next.length * 10);
    if (newRisk > 70) setMascotMessage("Careful! High risk ahead. Maybe add something steadier?");
    else if (newRisk < 20) setMascotMessage("Very safe nest! Cozy and steady.");
    else setMascotMessage("Great pick! Your portfolio is looking strong.");
  };

  const removeInvestment = (id: string) => {
    setActivePortfolio((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveProgress({ portfolio: next });
      return next;
    });
    setMascotMessage("Investment removed. Pick a new one from Scouted.");
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
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase" style={nunito}>My Nest</p>
            <h1 className="text-2xl text-foreground mt-0.5" style={{ ...nunito, fontWeight: 900 }}>Dashboard</h1>
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
            { label: "Balance", value: `CHF ${balance.toLocaleString()}`, sub: `+CHF ${monthlyIncome}/mes`, subStyle: { color: CELESTE } },
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
                <p className="text-xs text-muted-foreground" style={nunito}>Toca una inversión para agregarla</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {enrichedPortfolio.map((inv) => (
                    <motion.div key={inv.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} layout>
                      <DraggableCard inv={inv} zone="nest" onClick={() => removeInvestment(inv.id)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </DropZone>

          {/* Scouted — horizontal scroll on mobile */}
          <DropZone id="scouted">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 mt-4" style={nunito}>Explorar</h2>
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
            onClose={() => setSimulationOpen(false)}
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
