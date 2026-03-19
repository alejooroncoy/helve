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

export const availableInvestments: Investment[] = [
  { id: "treasury", name: "US Treasury Bond ETF", emoji: "🏛️", type: "safe", riskLevel: 1, annualReturn: 4.1, flag: "🇺🇸", tag: "BONUS" },
  { id: "retirement-low", name: "Retirement Insurance", emoji: "📋", type: "safe", riskLevel: 2, annualReturn: 3.8, flag: "🇩🇪" },
  { id: "retirement-mid", name: "Retirement Insurance Plus", emoji: "📋", type: "balanced", riskLevel: 5, annualReturn: 6.5, flag: "🇩🇪" },
  { id: "global-equity", name: "Global Equity ETF (Growth)", emoji: "🌍", type: "growth", riskLevel: 7, annualReturn: 11.2 },
  { id: "real-estate", name: "European Real Estate ETF", emoji: "🏠", type: "balanced", riskLevel: 5, annualReturn: 6.5, flag: "🇪🇺" },
  { id: "venture", name: "Venture Capital Fund", emoji: "🚀", type: "growth", riskLevel: 10, annualReturn: 25.0, tag: "HIGH RISK" },
  { id: "tech-corp", name: "Direct Investment: Tech Corp", emoji: "💻", type: "growth", riskLevel: 9, annualReturn: 18.7 },
  { id: "green-energy", name: "Green Energy Fund", emoji: "🌱", type: "balanced", riskLevel: 4, annualReturn: 5.2 },
];

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
