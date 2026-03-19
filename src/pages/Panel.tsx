import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/useUserProgress";
import CoachChat from "@/components/CoachChat";
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
  const pool = availableInvestments.filter((i) => !activeIds.has(i.id));
  if (profile === "conservative") return pool.sort((a, b) => a.riskLevel - b.riskLevel).slice(0, 4);
  if (profile === "growth") return pool.sort((a, b) => b.annualReturn - a.annualReturn).slice(0, 4);
  return pool.sort((a, b) => Math.abs(5 - a.riskLevel) - Math.abs(5 - b.riskLevel)).slice(0, 4);
}

/* ---- Draggable investment card ---- */
function DraggableCard({
  inv,
  zone,
  onClick,
}: {
  inv: Investment;
  zone: "scouted" | "nest";
  onClick: () => void;
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
        <ScoutedCard inv={inv} />
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

function ScoutedCard({ inv, overlay }: { inv: Investment; overlay?: boolean }) {
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
        {!overlay && <span className="text-primary text-base font-bold">+</span>}
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
      className={`flex-1 min-w-0 rounded-3xl transition-all duration-200 p-1 -m-1 ${
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
    const newRisk = Math.round(next.reduce((s, i) => s + i.riskLevel, 0) / next.length * 10);
    if (newRisk > 70) setMascotMessage("Careful! Risky airspace! 🦅 Maybe add something steadier?");
    else if (newRisk < 20) setMascotMessage("Very cozy nest! 🪺 Safe and warm.");
    else setMascotMessage("Great pick! 🐦 Your flock is looking strong!");
  };

  const removeInvestment = (id: string) => {
    setActivePortfolio((prev) => prev.filter((i) => i.id !== id));
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
    const slots = activePortfolio.map((i) => i.type);
    sessionStorage.setItem("helve-portfolio-slots", JSON.stringify(slots));
    sessionStorage.setItem("helve-portfolio", JSON.stringify(activePortfolio));
    navigate("/");
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
          <div className="flex gap-4">
            {/* LEFT: My Nest */}
            <DropZone id="nest">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">My Nest 🪺</h2>
                <span className="text-xs text-muted-foreground">{activePortfolio.length}/4</span>
              </div>
              {activePortfolio.length === 0 ? (
                <div className="bg-card/50 rounded-3xl p-6 text-center border-2 border-dashed border-border">
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
                  <DraggableCard key={inv.id} inv={inv} zone="scouted" onClick={() => addInvestment(inv)} />
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
      <div className="px-5 pb-6 pt-3 space-y-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-2">
          <motion.button className="flex-1 bg-card text-foreground py-3 rounded-2xl text-xs font-bold shadow-sm" whileTap={{ scale: 0.95 }} onClick={() => { setActivePortfolio([]); setMascotMessage("Empty nest! 🪹 Let's scout fresh investments."); }}>
            🔄 Reset
          </motion.button>
          <motion.button className="flex-1 bg-card text-foreground py-3 rounded-2xl text-xs font-bold shadow-sm" whileTap={{ scale: 0.95 }} onClick={() => setMascotMessage("The wisest birds stay perched during storms! 🦉 Patience builds the strongest nests.")}>
            🦉 Wisdom
          </motion.button>
          <motion.button className="flex-1 bg-card text-foreground py-3 rounded-2xl text-xs font-bold shadow-sm" whileTap={{ scale: 0.95 }} onClick={() => setMascotMessage("Mix high-flyers with steady perchers! 🐦 A diverse flock weathers any storm.")}>
            💬 Ask Me
          </motion.button>
        </div>

        <motion.button
          className={`w-full py-4 rounded-3xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
            activePortfolio.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          onClick={activePortfolio.length > 0 ? handleSimulate : undefined}
          whileHover={activePortfolio.length > 0 ? { scale: 1.02 } : {}}
          whileTap={activePortfolio.length > 0 ? { scale: 0.97 } : {}}
        >
          <img src="/face.png" alt="" className="w-6 h-6 rounded-full" />
          Take Flight 🦅
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Panel;
