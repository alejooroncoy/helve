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

export interface Investment {
  id: string;
  name: string;
  emoji: string;
  type: PortfolioSlot;
  riskLevel: number; // 1-10
  annualReturn: number; // percentage
  flag?: string;
  tag?: string;
}

// Re-export real investments from marketData as the canonical list
export { realInvestments as availableInvestments } from "./marketData";

export interface GameState {
  step: GameStep;
  riskScore: number; // 0–6, built from 3 questions (0–2 each)
  riskScores: number[]; // individual score per question for back navigation
  profile: RiskProfile;
  portfolio: Investment[]; // selected investments
  portfolioSlots: PortfolioSlot[]; // for simulation compatibility
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
  stormChoice: null,
  simulationResult: 0,
};

export function getProfile(score: number): RiskProfile {
  if (score <= 2) return "conservative";
  if (score <= 4) return "balanced";
  return "growth";
}

export function simulateGrowth(portfolio: PortfolioSlot[], stormChoice: "stay" | "sell" | null): number {
  const base = 100;
  let multiplier = 0;
  for (const slot of portfolio) {
    if (slot === "safe") multiplier += 0.02;
    else if (slot === "balanced") multiplier += 0.05;
    else multiplier += 0.09;
  }
  multiplier /= portfolio.length || 1;

  // 5 year compound
  let value = base * Math.pow(1 + multiplier, 5);

  // Storm penalty
  if (stormChoice === "sell") {
    value = base * Math.pow(1 + multiplier * 0.3, 5);
  }

  return Math.round(value);
}
