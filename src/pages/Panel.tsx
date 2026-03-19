import { useState, useMemo, useEffect } from "react";
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
import { LogOut } from "lucide-react";

function getRiskColor(risk: number): string {
  if (risk <= 3) return "text-primary";
  if (risk <= 6) return "text-accent";
  return "text-destructive";
}

function getRiskBg(risk: number): string {
  if (risk <= 3) return "bg-primary/10";
  if (risk <= 6) return "bg-accent/10";
  return "bg-destructive/10";
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

  // Risk comfort zone per profile
  const riskRange = profile === "conservative" ? [1, 4]
    : profile === "growth" ? [5, 10]
    : [3, 7];

  // Current portfolio metrics
  const avgRisk = active.length
    ? active.reduce((s, i) => s + i.riskLevel, 0) / active.length
    : riskRange[0] + (riskRange[1] - riskRange[0]) / 2;
  const hasType = (t: string) => activeTypes.has(t as any);
  const slotsLeft = 4 - active.length;

  // Score each candidate: higher = better suggestion
  const scored = pool.map((inv) => {
    let score = 0;

    // 1. Risk fit: prefer investments within the profile's comfort zone
    const inRange = inv.riskLevel >= riskRange[0] && inv.riskLevel <= riskRange[1];
    if (inRange) score += 30;
    else score -= Math.abs(inv.riskLevel - (riskRange[0] + riskRange[1]) / 2) * 3;

    // 2. Diversification: prefer types not yet in portfolio
    if (!hasType(inv.type)) score += 25;

    // 3. Balance: if portfolio is too risky, prefer safer; if too safe, prefer growth
    if (active.length > 0) {
      if (avgRisk > 7 && inv.riskLevel <= 4) score += 20; // counterbalance risk
      if (avgRisk < 3 && inv.riskLevel >= 5) score += 15; // nudge toward growth
    }

    // 4. Return efficiency: reward good risk-adjusted returns
    const efficiency = inv.annualReturn / Math.max(inv.riskLevel, 1);
    score += efficiency * 2;

    // 5. Beginner-friendly bonus for safe/balanced with decent returns
    if (profile === "conservative" && inv.riskLevel <= 3) score += 10;
    if (profile === "balanced" && inv.riskLevel >= 3 && inv.riskLevel <= 6) score += 10;

    // 6. If portfolio is empty, heavily favor profile-matching investments
    if (active.length === 0) {
      if (profile === "conservative" && inv.type === "safe") score += 20;
      if (profile === "balanced" && inv.type === "balanced") score += 20;
      if (profile === "growth" && inv.type === "growth") score += 20;
    }

    // 7. Slight penalty for very high risk on conservative profiles
    if (profile === "conservative" && inv.riskLevel >= 8) score -= 15;

    return { inv, score };
  });

  // Sort by score descending, show up to 4
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(slotsLeft + 1, 4)).map((s) => s.inv);
}

/* ---- Draggable investment card ---- */
function DraggableCard({
  inv,
  zone,
  onClick,
  onAsk,
}: {
  inv: Investment;
  zone: "scouted" | "nest";
  onClick: () => void;
  onAsk?: () => void;
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
      {zone === "nest" ? (
        <NestCard inv={inv} />
      ) : (
        <ScoutedCard inv={inv} onAsk={onAsk} />
      )}
    </div>
  );
}

/* ---- Card variants ---- */
function NestCard({ inv, overlay }: { inv: Investment; overlay?: boolean }) {
  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-sm ${overlay ? "shadow-lg ring-2 ring-primary/30 rotate-2" : ""} cursor-grab active:cursor-grabbing`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          {inv.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{inv.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {riskWord(inv.riskLevel)} · Earns ~{inv.annualReturn}% per year
          </p>
        </div>
        {!overlay && <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-1">✕</span>}
      </div>
      {/* Visual risk meter */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-medium w-8">Risk</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${inv.riskLevel <= 3 ? "bg-primary" : inv.riskLevel <= 6 ? "bg-accent" : "bg-destructive"}`}
            style={{ width: `${inv.riskLevel * 10}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold ${getRiskColor(inv.riskLevel)}`}>{inv.riskLevel}/10</span>
      </div>
      {inv.tag && (
        <span className="inline-block mt-2 text-[10px] font-bold bg-accent/15 text-accent px-2.5 py-0.5 rounded-full">
          {inv.tag}
        </span>
      )}
    </div>
  );
}

function ScoutedCard({ inv, overlay, onAsk }: { inv: Investment; overlay?: boolean; onAsk?: () => void }) {
  return (
    <div className={`bg-card rounded-2xl p-3.5 shadow-sm border-2 border-dashed border-border ${overlay ? "shadow-lg ring-2 ring-primary/30 -rotate-2 border-primary/40" : "hover:border-primary/40"} cursor-grab active:cursor-grabbing`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          {inv.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{inv.name} {inv.flag || ""}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {riskWord(inv.riskLevel)} · Earns ~{inv.annualReturn}% per year
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!overlay && onAsk && (
            <span
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAsk(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-accent/20 transition-colors"
            >
              ?
            </span>
          )}
          {!overlay && <span className="text-primary text-base font-bold">+</span>}
        </div>
      </div>
      {/* Visual risk meter */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-medium w-8">Risk</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${inv.riskLevel <= 3 ? "bg-primary" : inv.riskLevel <= 6 ? "bg-accent" : "bg-destructive"}`}
            style={{ width: `${inv.riskLevel * 10}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold ${getRiskColor(inv.riskLevel)}`}>{inv.riskLevel}/10</span>
      </div>
      {inv.tag && (
        <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${inv.tag === "HIGH RISK" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          ⚠️ {inv.tag}
        </span>
      )}
    </div>
  );
}

/* ---- Droppable zone ---- */
function DropZone({
  id,
  children,
  isOver,
}: {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef, isOver: over } = useDroppable({ id });
  const active = isOver ?? over;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 rounded-3xl transition-all duration-200 p-1 -m-1 flex flex-col ${
        active ? "bg-primary/5 ring-2 ring-primary/20 ring-dashed" : ""
      }`}
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
    "Hey there! 👋 Drag an investment into your nest — or just tap it!"
  );
  const [draggedItem, setDraggedItem] = useState<{ inv: Investment; zone: string } | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInitQ, setCoachInitQ] = useState<string | undefined>(undefined);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const isMobile = useIsMobile();

  // Load saved progress on mount
  useEffect(() => {
    loadProgress().then((p) => {
      if (p) {
        setProfile(p.risk_profile);
        if (p.portfolio && p.portfolio.length > 0) {
          setActivePortfolio(p.portfolio);
        }
      }
    });
  }, [loadProgress]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const suggestions = useMemo(
    () => getSuggestions(profile, activePortfolio),
    [profile, activePortfolio]
  );

  const totalRisk = activePortfolio.length
    ? Math.round(activePortfolio.reduce((s, i) => s + i.riskLevel, 0) / activePortfolio.length * 10)
    : 0;

  const balance = 1000;
  const monthlyIncome = activePortfolio.reduce(
    (s, i) => s + Math.round((balance * i.annualReturn) / 100 / 12),
    0
  );

  const avgReturn = activePortfolio.length
    ? (activePortfolio.reduce((s, i) => s + i.annualReturn, 0) / activePortfolio.length).toFixed(1)
    : "0.0";

  const addInvestment = (inv: Investment) => {
    if (activePortfolio.length >= 4) {
      setMascotMessage("Your nest is full! 🪹 Remove one egg to make room.");
      return;
    }
    if (activePortfolio.find((i) => i.id === inv.id)) return;
    const next = [...activePortfolio, inv];
    setActivePortfolio(next);
    saveProgress({ portfolio: next });
    const newRisk = Math.round(next.reduce((s, i) => s + i.riskLevel, 0) / next.length * 10);
    if (newRisk > 70) setMascotMessage("Careful! Risky airspace! 🦅 Maybe add something steadier?");
    else if (newRisk < 20) setMascotMessage("Very cozy nest! 🪺 Safe and warm.");
    else setMascotMessage("Great pick! 🐦 Your flock is looking strong!");
  };

  const removeInvestment = (id: string) => {
    setActivePortfolio((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveProgress({ portfolio: next });
      return next;
    });
    setMascotMessage("Egg removed! 🥚 Pick a new one from Scouted.");
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { inv: Investment; zone: string };
    setDraggedItem(data);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);
    if (!over) return;

    const data = active.data.current as { inv: Investment; zone: string };
    const dropTarget = over.id as string;

    // Scouted → Nest
    if (data.zone === "scouted" && dropTarget === "nest") {
      addInvestment(data.inv);
    }
    // Nest → Scouted (remove)
    if (data.zone === "nest" && dropTarget === "scouted") {
      removeInvestment(data.inv.id);
    }
  };

  const handleSimulate = () => {
    saveProgress({ portfolio: activePortfolio });
    setSimulationOpen(true);
  };

  const handleSimSell = (id: string) => {
    removeInvestment(id);
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
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">My Nest</p>
            <h1 className="text-2xl font-bold text-foreground mt-0.5">Dashboard</h1>
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
                  className="w-12 h-12 rounded-full bg-card shadow-md overflow-hidden border-2 border-primary/20"
                  whileTap={{ scale: 0.9 }}
                >
                  <img src="/face.png" alt="Coach IA" className="w-full h-full object-cover" />
                </motion.button>
              </DrawerTrigger>
              <DrawerContent className="h-[80vh] p-0">
                <CoachChat onClose={() => setCoachOpen(false)} portfolio={activePortfolio} onAddInvestment={(id) => { const inv = availableInvestments.find(i => i.id === id); if (inv) addInvestment(inv); }} onRemoveInvestment={(id) => removeInvestment(id)} />
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={coachOpen} onOpenChange={setCoachOpen}>
              <PopoverTrigger asChild>
                <motion.button
                  className="w-12 h-12 rounded-full bg-card shadow-md overflow-hidden border-2 border-primary/20"
                  whileTap={{ scale: 0.9 }}
                >
                  <img src="/face.png" alt="Coach IA" className="w-full h-full object-cover" />
                </motion.button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[380px] h-[500px] p-0 rounded-2xl overflow-hidden">
                <CoachChat onClose={() => setCoachOpen(false)} portfolio={activePortfolio} onAddInvestment={(id) => { const inv = availableInvestments.find(i => i.id === id); if (inv) addInvestment(inv); }} onRemoveInvestment={(id) => removeInvestment(id)} />
              </PopoverContent>
            </Popover>
          )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3">
          <motion.div className="bg-card rounded-3xl p-4 shadow-sm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Balance</p>
            <p className="text-xl font-bold text-foreground mt-1">€{balance.toLocaleString()}</p>
            <p className="text-[10px] text-primary font-medium mt-0.5">+€{monthlyIncome}/mo</p>
          </motion.div>
          <motion.div className="bg-card rounded-3xl p-4 shadow-sm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Risk Level</p>
            <p className={`text-xl font-bold mt-1 ${totalRisk > 60 ? "text-destructive" : totalRisk > 30 ? "text-accent" : "text-primary"}`}>{totalRisk}%</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{getRiskLabel(totalRisk)}</p>
          </motion.div>
          <motion.div className="bg-card rounded-3xl p-4 shadow-sm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Avg Return</p>
            <p className="text-xl font-bold text-primary mt-1">{avgReturn}%</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Annual</p>
          </motion.div>
        </div>
      </div>


      {/* DnD Content */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="flex gap-4 h-full">
            {/* LEFT: My Nest */}
            <DropZone id="nest">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">My Nest 🪺</h2>
                <span className="text-xs text-muted-foreground">{activePortfolio.length}/4</span>
              </div>
              {activePortfolio.length === 0 ? (
                <div className="bg-card/50 rounded-3xl p-6 text-center border-2 border-dashed border-border flex-1 flex flex-col items-center justify-center">
                  <p className="text-3xl mb-2">🪹</p>
                  <p className="text-sm text-muted-foreground">Your nest is empty!</p>
                  <p className="text-xs text-muted-foreground mt-1">Drag investments here →</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {activePortfolio.map((inv) => (
                      <motion.div key={inv.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} layout>
                        <DraggableCard inv={inv} zone="nest" onClick={() => removeInvestment(inv.id)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </DropZone>

            {/* RIGHT: Scouted */}
            <DropZone id="scouted">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Scouted 🔭</h2>
              <div className="space-y-2">
                {suggestions.map((inv) => (
                  <DraggableCard key={inv.id} inv={inv} zone="scouted" onClick={() => addInvestment(inv)} onAsk={() => { setCoachInitQ(`Explícame de forma sencilla qué es ${inv.name} y si me conviene según mi perfil`); setCoachOpen(true); }} />
                ))}
              </div>
            </DropZone>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedItem ? (
            draggedItem.zone === "nest" ? (
              <NestCard inv={draggedItem.inv} overlay />
            ) : (
              <ScoutedCard inv={draggedItem.inv} overlay />
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bottom Actions */}
      <div className="px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <motion.button
          className={`w-full py-4 rounded-3xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
            activePortfolio.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          onClick={activePortfolio.length > 0 ? handleSimulate : undefined}
          whileHover={activePortfolio.length > 0 ? { scale: 1.02 } : {}}
          whileTap={activePortfolio.length > 0 ? { scale: 0.97 } : {}}
        >
          ⏩ Simular 1 año
        </motion.button>
        {activePortfolio.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Añade inversiones a tu nido para simular el paso del tiempo
          </p>
        )}
      </div>
      {/* Time Simulation */}
      <AnimatePresence>
        {simulationOpen && (
          <TimeSimulation
            portfolio={activePortfolio}
            onClose={() => setSimulationOpen(false)}
            onSellInvestment={handleSimSell}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Panel;
