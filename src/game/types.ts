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

export type AssetClass = "bonds" | "equity" | "gold" | "realEstate" | "alternatives";

export interface AssetAllocation {
  bonds: number;
  equity: number;
  gold: number;
  realEstate: number;
  alternatives: number;
}

export const ASSET_CLASSES: { key: AssetClass; emoji: string; riskWeight: number }[] = [
  { key: "bonds", emoji: "🏦", riskWeight: 2 },
  { key: "equity", emoji: "📈", riskWeight: 7 },
  { key: "gold", emoji: "🥇", riskWeight: 4 },
  { key: "realEstate", emoji: "🏠", riskWeight: 3 },
  { key: "alternatives", emoji: "💎", riskWeight: 8 },
];

export const RECOMMENDED_ALLOCATIONS: Record<RiskProfile, AssetAllocation> = {
  conservative: { bonds: 50, equity: 15, gold: 20, realEstate: 15, alternatives: 0 },
  balanced: { bonds: 25, equity: 40, gold: 10, realEstate: 15, alternatives: 10 },
  growth: { bonds: 10, equity: 55, gold: 5, realEstate: 10, alternatives: 20 },
};

export function getAllocationRiskScore(alloc: AssetAllocation): number {
  return ASSET_CLASSES.reduce((sum, c) => sum + (alloc[c.key] / 100) * c.riskWeight, 0);
}

export function getProfileRiskRange(profile: RiskProfile): [number, number] {
  if (profile === "conservative") return [1, 3.5];
  if (profile === "balanced") return [3, 5.5];
  return [5, 8];
}

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
  assetAllocation: { bonds: 25, equity: 40, gold: 10, realEstate: 15, alternatives: 10 },
  stormChoice: null,
  simulationResult: 0,
};

export function getProfile(score: number): RiskProfile {
  if (score <= 2) return "conservative";
  if (score <= 4) return "balanced";
  return "growth";
}
