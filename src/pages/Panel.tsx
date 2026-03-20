import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useInstrumentStats } from "@/hooks/useMarketData";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useUserPortfolios, type NestPortfolio } from "@/hooks/useUserPortfolios";
import CoachChat from "@/components/CoachChat";
import TimeSimulation from "@/components/game/TimeSimulation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Investment, AssetClass } from "@/game/types";
import { ASSET_CLASSES, ALL_ASSET_DB_IDS } from "@/game/types";
import { availableInvestments } from "@/game/types";
import {
  LogOut,
  X,
  AlertTriangle,
  Inbox,
  Shield,
  TrendingUp,
  BarChart2,
  Building2,
  Leaf,
  Globe,
  Landmark,
  Zap,
  FastForward,
  MessageCircle,
  DollarSign,
  Info,
  Wallet,
  ChevronLeft,
  GripVertical,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const CELESTE = "#5BB8F5";

const MascotIcon = () => <img src="/mascot-owl.png" alt="mascot" className="w-6 h-6 rounded-full object-cover" />;

const mascotToast = (msg: string) => toast(msg, { icon: <MascotIcon />, duration: 3000 });

// Map category keys to their representative DB IDs for stats enrichment
const categoryToDbIds: Record<string, string[]> = {};
ASSET_CLASSES.forEach((cls) => {
  categoryToDbIds[cls.key] = cls.dbIds;
});
const allDbIds = ALL_ASSET_DB_IDS;

const CLASS_COLORS: Record<AssetClass, string> = {
  bonds: "hsl(210, 60%, 55%)",
  equity: "hsl(145, 58%, 36%)",
  gold: "hsl(38, 92%, 50%)",
  fx: "hsl(200, 70%, 50%)",
  swissStocks: "hsl(0, 72%, 51%)",
  usStocks: "hsl(220, 70%, 50%)",
  crypto: "hsl(270, 60%, 55%)",
  cleanEnergy: "hsl(150, 60%, 45%)",
};

function getCategoryIcon(key: string) {
  switch (key) {
    case "bonds":
      return <Landmark className="w-5 h-5" />;
    case "equity":
      return <Globe className="w-5 h-5" />;
    case "gold":
      return <Shield className="w-5 h-5" />;
    case "fx":
      return <DollarSign className="w-5 h-5" />;
    case "swissStocks":
      return <BarChart2 className="w-5 h-5" />;
    case "usStocks":
      return <TrendingUp className="w-5 h-5" />;
    case "crypto":
      return <Zap className="w-5 h-5" />;
    case "cleanEnergy":
      return <Leaf className="w-5 h-5" />;
    default:
      return <BarChart2 className="w-5 h-5" />;
  }
}

function getRiskBarColor(risk: number): string {
  if (risk <= 3) return CELESTE;
  if (risk <= 6) return "hsl(var(--accent))";
  return "hsl(var(--destructive))";
}

function getSuggestions(profile: string, active: Investment[]): Investment[] {
  const activeIds = new Set(active.map((i) => i.id));
  const pool = availableInvestments.filter((i) => !activeIds.has(i.id));
  if (pool.length === 0) return [];

  const riskRange = profile === "conservative" ? [1, 4] : profile === "growth" ? [5, 10] : [3, 7];

  const scored = pool.map((inv) => {
    let score = 0;
    const inRange = inv.riskLevel >= riskRange[0] && inv.riskLevel <= riskRange[1];
    if (inRange) score += 30;
    else score -= Math.abs(inv.riskLevel - (riskRange[0] + riskRange[1]) / 2) * 3;
    if (profile === "conservative" && inv.riskLevel <= 3) score += 10;
    if (profile === "balanced" && inv.riskLevel >= 3 && inv.riskLevel <= 6) score += 10;
    if (profile === "growth" && inv.riskLevel >= 6) score += 10;
    return { inv, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.inv);
}

/* ---- Draggable category card ---- */
function DraggableCard({
  inv,
  zone,
  onClick,
  onAsk,
  onSell,
  onInfo,
  allocation,
  balance,
  t,
  isMobile,
}: {
  inv: Investment;
  zone: "scouted" | "nest";
  onClick: () => void;
  onAsk?: () => void;
  onSell?: () => void;
  onInfo?: () => void;
  allocation?: number;
  balance?: number;
  t: any;
  isMobile?: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `${zone}-${inv.id}`,
    data: { inv, zone },
  });

  const dragHandleProps = undefined;

  const rootDragProps = isMobile ? {} : { ...listeners, ...attributes };

  return (
    <div
      ref={setNodeRef}
      {...rootDragProps}
      onClick={zone === "scouted" ? onClick : undefined}
      className={`select-none transition-all h-full w-full ${isDragging ? "opacity-30 scale-95" : ""}`}
    >
      {zone === "nest" ? (
        <NestCard
          inv={inv}
          onSell={onSell}
          onAsk={onAsk}
          onInfo={onInfo}
          allocation={allocation}
          balance={balance}
          t={t}
          overlay={false}
          isMobile={isMobile}
          dragHandleProps={dragHandleProps}
        />
      ) : (
        <ScoutedCard
          inv={inv}
          onAsk={onAsk}
          t={t}
          overlay={false}
          isMobile={isMobile}
          dragHandleProps={dragHandleProps}
        />
      )}
    </div>
  );
}

function NestCard({
  inv,
  overlay,
  onSell,
  onAsk,
  onInfo,
  allocation,
  balance,
  t,
  isMobile,
  dragHandleProps,
}: {
  inv: Investment;
  overlay?: boolean;
  onSell?: () => void;
  onAsk?: () => void;
  onInfo?: () => void;
  allocation?: number;
  balance?: number;
  t: any;
  isMobile?: boolean;
  dragHandleProps?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = allocation ?? 25;
  const chfAmount = balance ? Math.round((balance * pct) / 100) : 0;
  const displayName = t(`allocation.classes.${inv.id}`, { defaultValue: inv.name });
  const color = CLASS_COLORS[inv.id as AssetClass] || CELESTE;

  return (
    <div
      className={`bg-card rounded-2xl p-3.5 shadow-sm ${overlay ? "shadow-lg rotate-2 cursor-grabbing" : isMobile ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={overlay ? { boxShadow: `0 0 0 2px ${color}40` } : {}}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {getCategoryIcon(inv.id)}
        </div>
        <div
          className="flex-1 min-w-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-foreground" style={nunito}>
              {displayName}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground" style={nunito}>
              {t("panel.riskLabel")}{" "}
              <span style={{ color: getRiskBarColor(inv.riskLevel), fontWeight: 700 }}>{inv.riskLevel}/10</span>
            </span>
            <span className="text-xs" style={{ ...nunito, color, fontWeight: 700 }}>
              {inv.annualReturn}%{t("common.perYear")}
            </span>
          </div>
        </div>
        {!overlay && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="flex flex-col items-end"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-bold" style={{ ...nunito, color }}>
                {pct}%
              </span>
              <span className="text-[10px] text-muted-foreground" style={nunito}>
                CHF {chfAmount}
              </span>
            </div>
            {!isMobile && dragHandleProps && (
              <button
                type="button"
                {...dragHandleProps}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center"
                aria-label={t("panel.myNest")}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && !overlay && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] text-muted-foreground mt-2 px-1" style={nunito}>
              {t(`allocation.classDesc.${inv.id}`, { defaultValue: "" })}
            </p>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onSell?.();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive transition-colors"
                style={nunito}
                whileTap={{ scale: 0.95 }}
              >
                <DollarSign className="w-3.5 h-3.5" /> {t("panel.sell")}
              </motion.button>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onAsk?.();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ ...nunito, backgroundColor: `${color}15`, color }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> {t("panel.ask")}
              </motion.button>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onInfo?.();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground transition-colors"
                style={nunito}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart2 className="w-3.5 h-3.5" /> {t("panel.detail")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoutedCard({
  inv,
  overlay,
  onAsk,
  t,
  isMobile,
  dragHandleProps,
}: {
  inv: Investment;
  overlay?: boolean;
  onAsk?: () => void;
  t: any;
  isMobile?: boolean;
  dragHandleProps?: any;
}) {
  const displayName = t(`allocation.classes.${inv.id}`, { defaultValue: inv.name });
  const color = CLASS_COLORS[inv.id as AssetClass] || CELESTE;

  return (
    <div
      className={`bg-card rounded-2xl p-3 shadow-sm border-2 border-dashed border-border ${overlay ? "-rotate-2 cursor-grabbing" : isMobile ? "" : "cursor-grab active:cursor-grabbing"} ${isMobile ? "min-h-0" : "min-h-[110px]"} h-full flex flex-col`}
      style={overlay ? { boxShadow: `0 0 0 2px ${color}40`, borderColor: `${color}60` } : {}}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ color }}
        >
          {getCategoryIcon(inv.id)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground leading-snug" style={nunito}>
            {displayName}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight" style={nunito}>
            {t(`allocation.classDesc.${inv.id}`, { defaultValue: "" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!overlay && onAsk && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAsk(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer flex-shrink-0"
              style={{ ...nunito, backgroundColor: `${color}18`, color }}
              aria-label="Info"
            >
              ?
            </button>
          )}
          {!overlay && !isMobile && dragHandleProps && (
            <button
              type="button"
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center"
              aria-label={t("panel.buy")}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {!isMobile && <div className="flex-grow" />}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ ...nunito, backgroundColor: `${getRiskBarColor(inv.riskLevel)}18`, color: getRiskBarColor(inv.riskLevel) }}
        >
          {t("panel.riskLabel")} {inv.riskLevel}/10
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ ...nunito, backgroundColor: `${color}18`, color }}
        >
          {inv.annualReturn}% {t("common.perYear")}
        </span>
        {!overlay && !isMobile && (
          <span className="ml-auto text-sm font-bold" style={{ color }}>+</span>
        )}
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
      className="flex-1 min-w-0 min-h-0 rounded-3xl transition-all duration-200 p-1 -m-1 flex flex-col"
      style={active ? { backgroundColor: `${CELESTE}08`, outline: `2px dashed ${CELESTE}40` } : {}}
    >
      {children}
    </div>
  );
}

/* ---- Buy confirmation dialog ---- */
function BuyConfirmDialog({
  inv,
  onConfirm,
  onCancel,
  t,
  availablePct,
}: {
  inv: Investment;
  onConfirm: (dontShowAgain: boolean, pct: number) => void;
  onCancel: () => void;
  t: any;
  availablePct: number;
}) {
  const displayName = t(`allocation.classes.${inv.id}`, { defaultValue: inv.name });
  const color = CLASS_COLORS[inv.id as AssetClass] || CELESTE;
  const maxPct = Math.min(100, availablePct);
  const [pct, setPct] = useState(Math.min(25, maxPct));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-sm bg-card rounded-3xl p-5 shadow-xl"
        initial={{ y: 100, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 100, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <motion.img
            src="/perspectiva1.png"
            alt="Búho"
            className="w-14 h-14 rounded-full shadow-md flex-shrink-0 object-cover"
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 0.8 }}
          />
          <div>
            <p className="text-base font-bold text-foreground" style={nunito}>
              {t("panel.buyDialogTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5" style={nunito}>
              {t("panel.buyDialogDesc")}
            </p>
          </div>
        </div>
        <div className="bg-muted/50 rounded-2xl p-3 mb-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {getCategoryIcon(inv.id)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground" style={nunito}>
              {displayName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ ...nunito, color: getRiskBarColor(inv.riskLevel), fontWeight: 700 }}>
                {t("panel.riskLabel")} {inv.riskLevel}/10
              </span>
              <span className="text-xs" style={{ ...nunito, color, fontWeight: 700 }}>
                {inv.annualReturn}%{t("common.perYear")}
              </span>
            </div>
          </div>
        </div>

        {/* Allocation slider */}
        <div className="bg-muted/30 rounded-2xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={nunito}>
              {t("panel.allocation")}
            </p>
            <p className="text-sm font-bold" style={{ ...nunito, color }}>{pct}%</p>
          </div>
          <input
            type="range"
            min={1}
            max={maxPct}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: color,
              background: `linear-gradient(to right, ${color} ${(pct / maxPct) * 100}%, hsl(var(--muted)) ${(pct / maxPct) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground" style={nunito}>1%</span>
            <span className="text-[10px] text-muted-foreground" style={nunito}>{maxPct}% max</span>
          </div>
        </div>

        <div className="space-y-2">
          <motion.button
            onClick={() => onConfirm(false, pct)}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white"
            style={{ ...nunito, backgroundColor: color }}
            whileTap={{ scale: 0.97 }}
          >
            {t("panel.buyDialogConfirm")} — {pct}%
          </motion.button>
          <motion.button
            onClick={() => onConfirm(true, pct)}
            className="w-full py-2.5 rounded-2xl text-xs font-bold text-muted-foreground bg-muted/60"
            style={nunito}
            whileTap={{ scale: 0.97 }}
          >
            {t("panel.buyDialogDontRemind")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
/* ---- Main Panel ---- */
const Panel = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { loadProgress, saveProgress } = useUserProgress();
  const { nests, loading: nestsLoading, createNest, updateNest, deleteNest } = useUserPortfolios();
  const { t } = useTranslation();
  const [activeNestId, setActiveNestId] = useState<string | null>(null);
  const [activePortfolio, setActivePortfolio] = useState<Investment[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState("balanced");
  const [balance, setBalance] = useState(1000);
  const [lastSimGain, setLastSimGain] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ inv: Investment; zone: string } | null>(null);
  const [buyDialogInv, setBuyDialogInv] = useState<Investment | null>(null);
  const [skipBuyDialog, setSkipBuyDialog] = useState(() => localStorage.getItem("helve_skip_buy_dialog") === "1");
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInitQ, setCoachInitQ] = useState<string | undefined>(undefined);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simMonths, setSimMonths] = useState(12);
  const [renamingNest, setRenamingNest] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const isMobile = useIsMobile();

  const { stats, loading: statsLoading } = useInstrumentStats(allDbIds);

  // Enrich category investments with averaged stats from their DB instruments
  const enrichInvestment = useCallback(
    (inv: Investment): Investment => {
      const cls = ASSET_CLASSES.find((c) => c.key === inv.id);
      if (!cls || cls.dbIds.length === 0) return inv;
      const dbStats = cls.dbIds.map((id) => stats[id]).filter(Boolean);
      if (dbStats.length === 0) return inv;
      const avgReturn = dbStats.reduce((s, st) => s + st.avgAnnualReturn, 0) / dbStats.length;
      const avgRisk = Math.round(dbStats.reduce((s, st) => s + st.riskLevel, 0) / dbStats.length);
      return { ...inv, annualReturn: Math.round(avgReturn * 10) / 10, riskLevel: avgRisk || inv.riskLevel };
    },
    [stats],
  );

  const enrichedPortfolio = useMemo(() => activePortfolio.map(enrichInvestment), [activePortfolio, enrichInvestment]);
  const enrichedAvailable = useMemo(() => availableInvestments.map(enrichInvestment), [enrichInvestment]);

  // Load profile from user_progress
  useEffect(() => {
    loadProgress().then((p) => {
      if (p) setProfile(p.risk_profile);
    });
  }, [loadProgress]);

  // When nests load, select first or create default. Balance is global from first nest.
  useEffect(() => {
    if (nestsLoading) return;
    if (nests.length > 0) {
      // Use first nest's balance as the global balance
      setBalance(nests[0].balance);
      if (!activeNestId || !nests.find((n) => n.id === activeNestId)) {
        switchToNest(nests[0]);
      }
    } else {
      // Auto-create first nest
      createNest(t("panel.myNest")).then((nest) => {
        if (nest) {
          setBalance(nest.balance);
          switchToNest(nest);
        }
      });
    }
  }, [nests, nestsLoading]);

  const switchToNest = useCallback((nest: NestPortfolio) => {
    setActiveNestId(nest.id);
    setActivePortfolio(nest.portfolio);
    setAllocations(nest.allocations);
    // Balance is global — don't change it when switching nests
    setLastSimGain(null);
  }, []);

  // Sync when activeNestId changes from tabs
  const handleTabClick = useCallback(
    (nest: NestPortfolio) => {
      switchToNest(nest);
    },
    [switchToNest],
  );

  const handleCreateNest = useCallback(async () => {
    if (nests.length >= 4) {
      mascotToast(t("panel.maxNests"));
      return;
    }
    const name = t("panel.nestTab", { n: nests.length + 1 });
    const nest = await createNest(name);
    if (nest) switchToNest(nest);
  }, [nests.length, createNest, switchToNest, t]);

  const handleDeleteNest = useCallback(
    async (nestId: string) => {
      if (nests.length <= 1) return; // keep at least 1
      await deleteNest(nestId);
      if (activeNestId === nestId) {
        const remaining = nests.filter((n) => n.id !== nestId);
        if (remaining.length > 0) switchToNest(remaining[0]);
      }
    },
    [nests, activeNestId, deleteNest, switchToNest],
  );

  const handleRenameNest = useCallback(
    async (nestId: string, newName: string) => {
      if (!newName.trim()) return;
      await updateNest(nestId, { name: newName.trim() });
      setRenamingNest(null);
    },
    [updateNest],
  );

  // Save helpers that persist to the active nest
  const saveNestData = useCallback(
    (patch: Partial<Pick<NestPortfolio, "portfolio" | "allocations" | "balance">>) => {
      if (!activeNestId) return;
      updateNest(activeNestId, patch);
    },
    [activeNestId, updateNest],
  );

  const handleSimulationComplete = useCallback(
    (finalBalance: number, gainPct: number) => {
      setBalance(finalBalance);
      setLastSimGain(gainPct);
      // Balance is global — sync to ALL nests
      nests.forEach((nest) => {
        updateNest(nest.id, { balance: finalBalance });
      });
      if (gainPct > 0) mascotToast(t("panel.nestGrew", { pct: gainPct.toFixed(1) }));
      else mascotToast(t("panel.nestDropped", { pct: Math.abs(gainPct).toFixed(1) }));
    },
    [nests, updateNest, t],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const suggestions = useMemo(() => getSuggestions(profile, enrichedPortfolio), [profile, enrichedPortfolio]);

  const totalAllocated = useMemo(() => {
    return enrichedPortfolio.reduce((s, i) => s + (allocations[i.id] ?? 0), 0);
  }, [enrichedPortfolio, allocations]);

  const totalRisk = enrichedPortfolio.length
    ? Math.round(
        totalAllocated > 0
          ? (enrichedPortfolio.reduce((s, i) => s + i.riskLevel * (allocations[i.id] ?? 0), 0) / totalAllocated) * 10
          : (enrichedPortfolio.reduce((s, i) => s + i.riskLevel, 0) / enrichedPortfolio.length) * 10,
      )
    : 0;

  const monthlyIncome = enrichedPortfolio.reduce((s, i) => {
    const pct = allocations[i.id] ?? 0;
    return s + Math.round((((balance * pct) / 100) * i.annualReturn) / 100 / 12);
  }, 0);
  const avgReturn =
    enrichedPortfolio.length && totalAllocated > 0
      ? (enrichedPortfolio.reduce((s, i) => s + i.annualReturn * (allocations[i.id] ?? 0), 0) / totalAllocated).toFixed(1)
      : enrichedPortfolio.length
        ? (enrichedPortfolio.reduce((s, i) => s + i.annualReturn, 0) / enrichedPortfolio.length).toFixed(1)
        : "0.0";

  // Per-nest stats for tab badges
  const getNestStats = useCallback((nest: NestPortfolio) => {
    const portfolio = (nest.portfolio || []).map(enrichInvestment);
    const allocs = nest.allocations || {};
    const totalAlloc = portfolio.reduce((s, i) => s + (allocs[i.id] ?? 0), 0);
    const risk = portfolio.length
      ? Math.round(
          totalAlloc > 0
            ? (portfolio.reduce((s, i) => s + i.riskLevel * (allocs[i.id] ?? 0), 0) / totalAlloc) * 10
            : (portfolio.reduce((s, i) => s + i.riskLevel, 0) / portfolio.length) * 10,
        )
      : 0;
    const ret = portfolio.length && totalAlloc > 0
      ? (portfolio.reduce((s, i) => s + i.annualReturn * (allocs[i.id] ?? 0), 0) / totalAlloc).toFixed(1)
      : portfolio.length
        ? (portfolio.reduce((s, i) => s + i.annualReturn, 0) / portfolio.length).toFixed(1)
        : "0";
    return { risk, ret, count: portfolio.length };
  }, [enrichInvestment]);

  const executeBuy = useCallback(
    (inv: Investment, customPct?: number) => {
      if (activePortfolio.find((i) => i.id === inv.id)) return;
      const next = [...activePortfolio, inv];
      const currentTotal = Object.values(allocations).reduce((s, v) => s + v, 0);
      const remaining = 100 - currentTotal;
      const newAlloc = customPct != null ? Math.min(customPct, remaining) : Math.min(25, remaining);
      const newAllocations = { ...allocations, [inv.id]: newAlloc };
      setActivePortfolio(next);
      setAllocations(newAllocations);
      saveNestData({ portfolio: next, allocations: newAllocations });
      const newRisk = Math.round((next.reduce((s, i) => s + i.riskLevel, 0) / next.length) * 10);
      if (newRisk > 70) mascotToast(t("panel.riskyBuy"));
      else if (newRisk < 20) mascotToast(t("panel.safeBuy"));
      else mascotToast(t("panel.normalBuy"));
    },
    [activePortfolio, allocations, saveNestData, t],
  );

  const tryBuyInvestment = useCallback(
    (inv: Investment) => {
      if (activePortfolio.find((i) => i.id === inv.id)) return;
      if (totalAllocated >= 100) {
        mascotToast(t("panel.noCapital"));
        return;
      }
      if (skipBuyDialog) executeBuy(inv);
      else setBuyDialogInv(inv);
    },
    [activePortfolio, skipBuyDialog, executeBuy, t, totalAllocated],
  );

  const handleBuyConfirm = useCallback(
    (dontShowAgain: boolean, pct: number) => {
      if (dontShowAgain) {
        setSkipBuyDialog(true);
        localStorage.setItem("helve_skip_buy_dialog", "1");
      }
      if (buyDialogInv) executeBuy(buyDialogInv, pct);
      setBuyDialogInv(null);
    },
    [buyDialogInv, executeBuy],
  );

  const removeInvestment = (id: string) => {
    const removed = activePortfolio.find((i) => i.id === id);
    setActivePortfolio((prev) => {
      const next = prev.filter((i) => i.id !== id);
      const newAllocations = { ...allocations };
      delete newAllocations[id];
      setAllocations(newAllocations);
      saveNestData({ portfolio: next, allocations: newAllocations });
      return next;
    });
    if (removed) {
      const displayName = t(`allocation.classes.${removed.id}`, { defaultValue: removed.name });
      mascotToast(t("panel.soldMsg", { name: displayName }));
    } else {
      mascotToast(t("panel.soldGeneric"));
    }
  };

  const handleSwapFromCoach = useCallback(
    (removeId: string, addId: string) => {
      const toRemove = activePortfolio.find((i) => i.id === removeId);
      const toAdd = enrichedAvailable.find((i) => i.id === addId);
      if (!toAdd) return;
      const removedAlloc = allocations[removeId] ?? 25;
      setActivePortfolio((prev) => {
        const next = prev.filter((i) => i.id !== removeId);
        if (!next.find((i) => i.id === addId)) next.push(toAdd);
        const newAllocations = { ...allocations };
        delete newAllocations[removeId];
        newAllocations[addId] = removedAlloc;
        setAllocations(newAllocations);
        saveNestData({ portfolio: next, allocations: newAllocations });
        return next;
      });
      const removeName = t(`allocation.classes.${removeId}`, { defaultValue: toRemove?.name || removeId });
      const addName = t(`allocation.classes.${addId}`, { defaultValue: toAdd.name });
      mascotToast(t("panel.swapMsg", { removed: removeName, added: addName }));
    },
    [activePortfolio, enrichedAvailable, allocations, saveNestData, t],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.data.current as { inv: Investment; zone: string });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);
    if (!over) return;
    const data = active.data.current as { inv: Investment; zone: string };
    const dropTarget = over.id as string;
    if (data.zone === "scouted" && dropTarget === "nest") tryBuyInvestment(data.inv);
    if (data.zone === "nest" && dropTarget === "scouted") removeInvestment(data.inv.id);
  };

  const handleSimulate = () => {
    saveNestData({ portfolio: activePortfolio });
    setSimulationOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getRiskLabelLocal = (risk: number): string => {
    if (risk <= 30) return t("portfolio.low");
    if (risk <= 60) return t("portfolio.medium");
    return t("portfolio.high");
  };

  const simPeriods = [
    { label: t("simulation.periods.3m"), months: 3 },
    { label: t("simulation.periods.6m"), months: 6 },
    { label: t("simulation.periods.1y"), months: 12 },
    { label: t("simulation.periods.5y"), months: 60 },
  ];

  return (
    <motion.div
      className="h-screen bg-background flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header — actions row */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3 gap-2">
          <motion.button
            onClick={() => navigate("/panel")}
            className="w-9 h-9 rounded-full bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            whileTap={{ scale: 0.9 }}
            title="Back to hub"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {isMobile ? (
            <Drawer open={coachOpen} onOpenChange={setCoachOpen}>
              <DrawerTrigger asChild>
                <motion.button
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-card shadow-md border-2"
                  style={{ borderColor: `${CELESTE}40` }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img src="/perspectiva1.png" alt="Coach" className="w-6 h-6 rounded object-cover" />
                  <span className="text-xs font-medium text-foreground">{t("panel.talkCoach")}</span>
                </motion.button>
              </DrawerTrigger>
              <DrawerContent className="h-[80vh] p-0">
                <CoachChat
                  onClose={() => { setCoachOpen(false); setCoachInitQ(undefined); }}
                  portfolio={enrichedPortfolio}
                  onAddInvestment={(id) => { const inv = enrichedAvailable.find((i) => i.id === id); if (inv) tryBuyInvestment(inv); }}
                  onRemoveInvestment={(id) => removeInvestment(id)}
                  initialQuestion={coachInitQ}
                  onSwapAccepted={handleSwapFromCoach}
                />
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={coachOpen} onOpenChange={setCoachOpen}>
              <PopoverTrigger asChild>
                <motion.button
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-card shadow-md border-2"
                  style={{ borderColor: `${CELESTE}40` }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img src="/perspectiva1.png" alt="Coach" className="w-6 h-6 rounded object-cover" />
                  <span className="text-xs font-medium text-foreground">{t("panel.talkCoach")}</span>
                </motion.button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-[380px] h-[500px] p-0 rounded-2xl overflow-hidden">
                <CoachChat
                  onClose={() => { setCoachOpen(false); setCoachInitQ(undefined); }}
                  portfolio={enrichedPortfolio}
                  onAddInvestment={(id) => { const inv = enrichedAvailable.find((i) => i.id === id); if (inv) tryBuyInvestment(inv); }}
                  onRemoveInvestment={(id) => removeInvestment(id)}
                  initialQuestion={coachInitQ}
                  onSwapAccepted={handleSwapFromCoach}
                />
              </PopoverContent>
            </Popover>
          )}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <motion.button
              onClick={handleSignOut}
              className="w-9 h-9 rounded-full bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Stat Cards — Capital & Invested (global), Risk & Return (per nest) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="bg-card rounded-2xl p-3 shadow-sm flex items-stretch gap-3 col-span-2 sm:col-span-1">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={nunito}>
                {t("panel.capital")}
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5" style={nunito}>
                CHF {Math.round(balance * (100 - totalAllocated) / 100).toLocaleString()}
              </p>
            </div>
            <Separator orientation="vertical" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={nunito}>
                {t("panel.invested")}
              </p>
              <p className="text-lg font-bold mt-0.5" style={{ ...nunito, color: CELESTE }}>
                CHF {Math.round(balance * totalAllocated / 100).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-sm">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={nunito}>
              {t("panel.risk")}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ ...nunito, color: totalRisk > 60 ? "hsl(var(--destructive))" : totalRisk > 30 ? "hsl(var(--accent-foreground))" : CELESTE }}>
              {totalRisk}%
            </p>
            <p className="text-[10px] text-muted-foreground" style={nunito}>{getRiskLabelLocal(totalRisk)}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-sm">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium" style={nunito}>
              {t("panel.returnLabel")}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ ...nunito, color: CELESTE }}>
              {avgReturn}%
            </p>
            <p className="text-[10px] text-muted-foreground" style={nunito}>{t("panel.annual")}</p>
          </div>
        </div>
      </div>

      {/* Nest Tabs with per-nest stats */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {nests.map((nest) => {
            const ns = getNestStats(nest);
            const isActive = activeNestId === nest.id;
            return (
              <div key={nest.id} className="flex-shrink-0 relative">
                {renamingNest === nest.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRenameNest(nest.id, renameValue); }}
                    className="flex items-center"
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameNest(nest.id, renameValue)}
                      className="text-xs font-bold px-3 py-2 rounded-2xl bg-card border-2 outline-none w-24"
                      style={{ ...nunito, borderColor: CELESTE }}
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => handleTabClick(nest)}
                    className="flex flex-col items-start px-3 py-2 rounded-2xl text-xs transition-all border-2 min-w-[90px]"
                    style={{
                      ...nunito,
                      fontWeight: 700,
                      borderColor: isActive ? CELESTE : "hsl(var(--border))",
                      backgroundColor: isActive ? CELESTE + "15" : "hsl(var(--card))",
                      color: isActive ? CELESTE : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="truncate">{nest.name}</span>
                      {isActive && (
                        <span className="flex items-center gap-0.5 ml-auto">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenamingNest(nest.id); setRenameValue(nest.name); }}
                            className="p-0.5 rounded hover:bg-black/10 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {nests.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteNest(nest.id); }}
                              className="p-0.5 rounded hover:bg-destructive/20 text-destructive/70 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    {ns.count > 0 && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-medium" style={nunito}>
                        <span style={{ color: ns.risk > 60 ? "hsl(var(--destructive))" : ns.risk > 30 ? "hsl(var(--accent-foreground))" : CELESTE }}>
                          R {ns.risk}%
                        </span>
                        <span style={{ color: CELESTE }}>
                          {ns.ret}%/yr
                        </span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            );
          })}
          {nests.length < 4 && (
            <motion.button
              onClick={handleCreateNest}
              className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-colors"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
              whileHover={{ scale: 1.1, borderColor: CELESTE }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          )}
        </div>

      </div>

      {/* DnD Content */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 px-5 pb-4 flex flex-col overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
            {/* My Nest */}
            <div className="flex-1 min-h-0 md:pr-2 flex flex-col overflow-hidden">
              <DropZone id="nest">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide" style={nunito}>
                    {nests.find((n) => n.id === activeNestId)?.name || t("panel.myNest")}
                  </h2>
                </div>
                {enrichedPortfolio.length === 0 ? (
                  <div className="bg-card/50 rounded-3xl p-5 text-center border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground" style={nunito}>
                      {t("panel.nestEmpty")}
                    </p>
                    <p className="text-xs text-muted-foreground" style={nunito}>
                      {t("panel.nestEmptyHint")}
                    </p>
                  </div>
                ) : (
                <ScrollArea className="flex-1 min-h-0 md:max-h-[40vh]">
                  <div className="space-y-2 pr-2">
                    <AnimatePresence>
                      {enrichedPortfolio.map((inv) => (
                        <motion.div
                          key={inv.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          layout
                        >
                          <DraggableCard
                            inv={inv}
                            zone="nest"
                            onClick={() => {}}
                            t={t}
                            isMobile={isMobile}
                            onSell={() => removeInvestment(inv.id)}
                            onAsk={() => {
                              setCoachInitQ(
                                `Tengo ${t(`allocation.classes.${inv.id}`)} en mi nido. ¿Es buena inversión? ¿Debería quitarla o mantenerla?`,
                              );
                              setCoachOpen(true);
                            }}
                            onInfo={() => {
                              setCoachInitQ(
                                `Dame un análisis detallado de ${t(`allocation.classes.${inv.id}`)}: riesgo, retorno histórico, y perspectiva futura.`,
                              );
                              setCoachOpen(true);
                            }}
                            allocation={allocations[inv.id] ?? 0}
                            balance={balance}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
                )}
              </DropZone>
            </div>

            {/* Add categories */}
            <div className="md:w-[280px] lg:w-[320px] md:flex-shrink-0 min-h-0 md:border-l md:border-border md:pl-4 flex flex-col">
              <DropZone id="scouted">
                <h2
                  className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 md:mt-0 mt-4"
                  style={nunito}
                >
                  {t("panel.buy")}
                </h2>
                {/* Mobile: horizontal scroll */}
                <div
                  className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide items-stretch md:hidden"
                  style={{ scrollSnapType: "x mandatory", touchAction: "pan-x" }}
                >
                  {suggestions.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex-shrink-0 flex"
                      style={{ width: 170, minWidth: 160, scrollSnapAlign: "start" }}
                    >
                      <DraggableCard
                        inv={inv}
                        zone="scouted"
                        onClick={() => tryBuyInvestment(inv)}
                        t={t}
                        isMobile={isMobile}
                        onAsk={() => {
                          setCoachInitQ(
                            `Explica brevemente qué es ${t(`allocation.classes.${inv.id}`)} y si encaja con mi perfil`,
                          );
                          setCoachOpen(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <ScrollArea className="hidden md:block flex-1 min-h-0">
                  <div className="flex flex-col gap-2 pr-2">
                    {suggestions.map((inv) => (
                      <div key={inv.id} className="w-full">
                        <DraggableCard
                          inv={inv}
                          zone="scouted"
                          onClick={() => tryBuyInvestment(inv)}
                          t={t}
                          isMobile={isMobile}
                          onAsk={() => {
                            setCoachInitQ(
                              `Explica brevemente qué es ${t(`allocation.classes.${inv.id}`)} y si encaja con mi perfil`,
                            );
                            setCoachOpen(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DropZone>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedItem ? (
            <div style={{ width: draggedItem.zone === "scouted" ? 160 : "auto", maxWidth: 340 }}>
              {draggedItem.zone === "nest" ? (
                <NestCard inv={draggedItem.inv} overlay t={t} isMobile={false} />
              ) : (
                <ScoutedCard inv={draggedItem.inv} overlay t={t} isMobile={false} />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bottom Actions */}
      <div className="px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-2 mb-3">
          {simPeriods.map((p) => (
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
          {t("panel.simulate")} {simPeriods.find((p) => p.months === simMonths)?.label}
        </motion.button>
        {activePortfolio.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2" style={nunito}>
            {t("panel.addToSimulate")}
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
            onAskCoach={(q) => {
              setCoachInitQ(q);
              setCoachOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buyDialogInv && (
          <BuyConfirmDialog
            inv={buyDialogInv}
            onConfirm={handleBuyConfirm}
            onCancel={() => setBuyDialogInv(null)}
            t={t}
            availablePct={100 - totalAllocated}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  function handleSimSell(id: string) {
    removeInvestment(id);
  }
};

export default Panel;
