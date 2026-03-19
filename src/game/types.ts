export type GameStep =
  | "welcome"
  | "risk-1"
  | "risk-2"
  | "risk-3"
  | "profile-result"
  | "portfolio"
  | "market-event"
  | "simulation"
  | "learning"
  | "loop";

export type RiskProfile = "conservative" | "balanced" | "growth";

export type PortfolioSlot = "safe" | "balanced" | "growth";

export type AssetClass =
  | "bonds"
  | "equity"
  | "gold"
  | "fx"
  | "swissStocks"
  | "usStocks"
  | "crypto"
  | "cleanEnergy";

export interface AssetClassMeta {
  key: AssetClass;
  emoji: string;
  riskWeight: number;
  dbCategory: string | null; // null = synthetic
  dbIds: string[]; // representative DB instrument IDs
  syntheticMonthly?: { mean: number; vol: number };
}

export const ASSET_CLASSES: AssetClassMeta[] = [
  { key: "bonds", emoji: "🏦", riskWeight: 2, dbCategory: "bond", dbIds: ["ch-bond-aaa", "global-bond-agg", "ch-govt-10y"] },
  { key: "equity", emoji: "📈", riskWeight: 6, dbCategory: "equity_index", dbIds: ["smi-index", "eurostoxx50", "djia-index", "dax-index", "nikkei225"] },
  { key: "gold", emoji: "🥇", riskWeight: 4, dbCategory: "gold", dbIds: ["gold-chf"] },
  { key: "fx", emoji: "💱", riskWeight: 5, dbCategory: "fx", dbIds: ["eurchf", "usdchf"] },
  { key: "swissStocks", emoji: "🇨🇭", riskWeight: 6, dbCategory: "stock_smi", dbIds: ["nesn-ch", "novn-ch", "rog-ch", "ubsg-ch", "logn-ch"] },
  { key: "usStocks", emoji: "🇺🇸", riskWeight: 7, dbCategory: "stock_djia", dbIds: ["aapl-us", "msft-us", "amzn-us", "nvda-us", "jpm-us"] },
  { key: "crypto", emoji: "🪙", riskWeight: 9, dbCategory: null, dbIds: [], syntheticMonthly: { mean: 0.008, vol: 0.12 } },
  { key: "cleanEnergy", emoji: "🌱", riskWeight: 7, dbCategory: null, dbIds: [], syntheticMonthly: { mean: 0.005, vol: 0.06 } },
];

export interface AssetAllocation {
  bonds: number;
  equity: number;
  gold: number;
  fx: number;
  swissStocks: number;
  usStocks: number;
  crypto: number;
  cleanEnergy: number;
}

export const EMPTY_ALLOCATION: AssetAllocation = {
  bonds: 0, equity: 0, gold: 0, fx: 0, swissStocks: 0, usStocks: 0, crypto: 0, cleanEnergy: 0,
};

export const RECOMMENDED_ALLOCATIONS: Record<RiskProfile, AssetAllocation> = {
  conservative: { bonds: 40, equity: 10, gold: 20, fx: 10, swissStocks: 10, usStocks: 5, crypto: 0, cleanEnergy: 5 },
  balanced:     { bonds: 20, equity: 15, gold: 10, fx: 5, swissStocks: 15, usStocks: 15, crypto: 10, cleanEnergy: 10 },
  growth:       { bonds: 5, equity: 15, gold: 5, fx: 5, swissStocks: 15, usStocks: 20, crypto: 20, cleanEnergy: 15 },
};

export function getAllocationRiskScore(alloc: AssetAllocation): number {
  return ASSET_CLASSES.reduce((sum, c) => sum + (alloc[c.key] / 100) * c.riskWeight, 0);
}

export function getProfileRiskRange(profile: RiskProfile): [number, number] {
  if (profile === "conservative") return [1, 3.5];
  if (profile === "balanced") return [3, 5.5];
  return [5, 9];
}

// All DB IDs used across all asset classes (for preloading)
export const ALL_ASSET_DB_IDS: string[] = ASSET_CLASSES.flatMap(c => c.dbIds);

export interface Investment {
  id: string;
  name: string;
  emoji: string;
  type: PortfolioSlot;
  riskLevel: number;
  annualReturn: number;
  flag?: string;
  tag?: string;
}

// Re-export real investments from marketData as the canonical list
export { realInvestments as availableInvestments } from "./marketData";

export interface GameState {
  step: GameStep;
  riskScore: number;
  riskScores: number[];
  profile: RiskProfile;
  portfolio: Investment[];
  portfolioSlots: PortfolioSlot[];
  assetAllocation: AssetAllocation;
  stormChoice: "stay" | "sell" | null;
  simulationResult: number;
}

export const initialGameState: GameState = {
  step: "welcome",
  riskScore: 0,
  riskScores: [],
  profile: "balanced",
  portfolio: [],
  portfolioSlots: [],
  assetAllocation: { ...RECOMMENDED_ALLOCATIONS.balanced },
  stormChoice: null,
  simulationResult: 0,
};

export function getProfile(score: number): RiskProfile {
  if (score <= 2) return "conservative";
  if (score <= 4) return "balanced";
  return "growth";
}

// ---- Multiplayer market events pool (20 events, category-based) ----
export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  emoji: string;
  sellImpact: number;
  holdImpact: number;
  affectedClasses: AssetClass[];
}

export const MARKET_EVENTS_POOL: MarketEvent[] = [
  { id: "e1", title: "marketEventsPool.crash.title", description: "marketEventsPool.crash.desc", emoji: "📉", sellImpact: 0.92, holdImpact: 0.78, affectedClasses: ["equity", "swissStocks", "usStocks"] },
  { id: "e2", title: "marketEventsPool.rateHike.title", description: "marketEventsPool.rateHike.desc", emoji: "🏦", sellImpact: 0.95, holdImpact: 0.88, affectedClasses: ["bonds", "fx"] },
  { id: "e3", title: "marketEventsPool.goldRush.title", description: "marketEventsPool.goldRush.desc", emoji: "🥇", sellImpact: 0.97, holdImpact: 1.12, affectedClasses: ["gold"] },
  { id: "e4", title: "marketEventsPool.pandemic.title", description: "marketEventsPool.pandemic.desc", emoji: "🦠", sellImpact: 0.88, holdImpact: 0.72, affectedClasses: ["equity", "usStocks", "swissStocks"] },
  { id: "e5", title: "marketEventsPool.cryptoBoom.title", description: "marketEventsPool.cryptoBoom.desc", emoji: "🚀", sellImpact: 0.96, holdImpact: 1.25, affectedClasses: ["crypto"] },
  { id: "e6", title: "marketEventsPool.cryptoCrash.title", description: "marketEventsPool.cryptoCrash.desc", emoji: "💥", sellImpact: 0.9, holdImpact: 0.55, affectedClasses: ["crypto"] },
  { id: "e7", title: "marketEventsPool.inflation.title", description: "marketEventsPool.inflation.desc", emoji: "🔥", sellImpact: 0.93, holdImpact: 0.85, affectedClasses: ["bonds", "fx"] },
  { id: "e8", title: "marketEventsPool.greenBoom.title", description: "marketEventsPool.greenBoom.desc", emoji: "🌍", sellImpact: 0.97, holdImpact: 1.18, affectedClasses: ["cleanEnergy"] },
  { id: "e9", title: "marketEventsPool.currencyWar.title", description: "marketEventsPool.currencyWar.desc", emoji: "💱", sellImpact: 0.94, holdImpact: 0.82, affectedClasses: ["fx", "bonds"] },
  { id: "e10", title: "marketEventsPool.dividend.title", description: "marketEventsPool.dividend.desc", emoji: "🎁", sellImpact: 0.98, holdImpact: 1.08, affectedClasses: ["swissStocks", "usStocks"] },
  { id: "e11", title: "marketEventsPool.recession.title", description: "marketEventsPool.recession.desc", emoji: "❄️", sellImpact: 0.9, holdImpact: 0.75, affectedClasses: ["equity", "usStocks", "swissStocks", "crypto"] },
  { id: "e12", title: "marketEventsPool.oilSpike.title", description: "marketEventsPool.oilSpike.desc", emoji: "🛢️", sellImpact: 0.95, holdImpact: 0.9, affectedClasses: ["equity", "cleanEnergy"] },
  { id: "e13", title: "marketEventsPool.regulation.title", description: "marketEventsPool.regulation.desc", emoji: "⚖️", sellImpact: 0.93, holdImpact: 0.8, affectedClasses: ["crypto", "cleanEnergy"] },
  { id: "e14", title: "marketEventsPool.aiRevolution.title", description: "marketEventsPool.aiRevolution.desc", emoji: "🤖", sellImpact: 0.97, holdImpact: 1.15, affectedClasses: ["usStocks", "equity"] },
  { id: "e15", title: "marketEventsPool.swissFrancSurge.title", description: "marketEventsPool.swissFrancSurge.desc", emoji: "🇨🇭", sellImpact: 0.94, holdImpact: 1.05, affectedClasses: ["fx", "swissStocks"] },
  { id: "e16", title: "marketEventsPool.bondDefault.title", description: "marketEventsPool.bondDefault.desc", emoji: "📜", sellImpact: 0.91, holdImpact: 0.78, affectedClasses: ["bonds"] },
  { id: "e17", title: "marketEventsPool.greenCrash.title", description: "marketEventsPool.greenCrash.desc", emoji: "🍂", sellImpact: 0.92, holdImpact: 0.7, affectedClasses: ["cleanEnergy"] },
  { id: "e18", title: "marketEventsPool.bullRun.title", description: "marketEventsPool.bullRun.desc", emoji: "🐂", sellImpact: 0.98, holdImpact: 1.2, affectedClasses: ["equity", "usStocks", "swissStocks"] },
  { id: "e19", title: "marketEventsPool.geopolitics.title", description: "marketEventsPool.geopolitics.desc", emoji: "🌐", sellImpact: 0.91, holdImpact: 0.82, affectedClasses: ["equity", "fx", "crypto"] },
  { id: "e20", title: "marketEventsPool.stablePeriod.title", description: "marketEventsPool.stablePeriod.desc", emoji: "☀️", sellImpact: 0.99, holdImpact: 1.05, affectedClasses: ["bonds", "gold", "swissStocks"] },
];
