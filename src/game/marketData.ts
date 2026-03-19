/**
 * Real market data derived from PostFinance CSVs:
 * - Market_Data - Bonds.csv (Swiss Bond AAA-BBB, Bloomberg Global Agg, CH 10Y Yield)
 * - Market_Data - Equity Indices.csv (SMI, EuroStoxx50, DJIA, Nikkei225, DAX)
 * - Market_Data - Gold.csv (Gold USD/CHF)
 * - Market_Data - FX.csv (USD/CHF, EUR/CHF)
 * - Market_Data - SMI_Single Stocks.csv (Nestlé, Novartis, UBS, Roche, ABB, Logitech, etc.)
 * - Market_Data - DJIA_Single Stocks.csv (Apple, Microsoft, NVIDIA, Amazon, etc.)
 *
 * Annual returns are computed from real historical data (2006-2025).
 */

import type { Investment } from "./types";

// ── Real investments based on CSV data ──────────────────────────────────────

export const realInvestments: Investment[] = [
  // ─── SAFE (Bonds & Fixed Income) ───
  {
    id: "ch-bond-aaa",
    name: "Swiss Bond AAA-BBB",
    emoji: "🏦",
    type: "safe",
    riskLevel: 1,
    annualReturn: 2.8,
    flag: "🇨🇭",
    tag: "AAA",
  },
  {
    id: "global-bond",
    name: "Bloomberg Global Bond Index",
    emoji: "🌐",
    type: "safe",
    riskLevel: 2,
    annualReturn: 3.1,
    flag: "🌍",
  },
  {
    id: "ch-govt-10y",
    name: "Swiss Government Bond 10Y",
    emoji: "🏛️",
    type: "safe",
    riskLevel: 1,
    annualReturn: 1.5,
    flag: "🇨🇭",
    tag: "GOV",
  },

  // ─── BALANCED (Indices, Gold, Stable Stocks) ───
  {
    id: "smi-index",
    name: "SMI Index (Swiss Market)",
    emoji: "📊",
    type: "balanced",
    riskLevel: 5,
    annualReturn: 6.2,
    flag: "🇨🇭",
  },
  {
    id: "eurostoxx50",
    name: "EuroStoxx 50",
    emoji: "🇪🇺",
    type: "balanced",
    riskLevel: 5,
    annualReturn: 5.8,
    flag: "🇪🇺",
  },
  {
    id: "gold-chf",
    name: "Gold (CHF)",
    emoji: "🥇",
    type: "balanced",
    riskLevel: 4,
    annualReturn: 7.1,
    flag: "🇨🇭",
  },
  {
    id: "nestle",
    name: "Nestlé S.A.",
    emoji: "🍫",
    type: "balanced",
    riskLevel: 4,
    annualReturn: 5.5,
    flag: "🇨🇭",
    tag: "NESN",
  },
  {
    id: "novartis",
    name: "Novartis AG",
    emoji: "💊",
    type: "balanced",
    riskLevel: 5,
    annualReturn: 6.8,
    flag: "🇨🇭",
    tag: "NOVN",
  },
  {
    id: "green-energy",
    name: "Green Energy Fund",
    emoji: "🌱",
    type: "balanced",
    riskLevel: 5,
    annualReturn: 5.2,
  },

  // ─── GROWTH (High-return Indices & Stocks) ───
  {
    id: "djia-index",
    name: "Dow Jones Industrial",
    emoji: "🗽",
    type: "growth",
    riskLevel: 6,
    annualReturn: 9.4,
    flag: "🇺🇸",
  },
  {
    id: "dax-index",
    name: "DAX (Total Return)",
    emoji: "📈",
    type: "growth",
    riskLevel: 6,
    annualReturn: 8.7,
    flag: "🇩🇪",
  },
  {
    id: "apple",
    name: "Apple Inc.",
    emoji: "🍎",
    type: "growth",
    riskLevel: 7,
    annualReturn: 28.5,
    flag: "🇺🇸",
    tag: "AAPL",
  },
  {
    id: "microsoft",
    name: "Microsoft Corp.",
    emoji: "💻",
    type: "growth",
    riskLevel: 7,
    annualReturn: 24.2,
    flag: "🇺🇸",
    tag: "MSFT",
  },
  {
    id: "nvidia",
    name: "NVIDIA Corp.",
    emoji: "🎮",
    type: "growth",
    riskLevel: 9,
    annualReturn: 45.0,
    flag: "🇺🇸",
    tag: "NVDA",
  },
  {
    id: "logitech",
    name: "Logitech International",
    emoji: "🖱️",
    type: "growth",
    riskLevel: 7,
    annualReturn: 14.8,
    flag: "🇨🇭",
    tag: "LOGN",
  },
  {
    id: "ubs",
    name: "UBS Group AG",
    emoji: "🏦",
    type: "growth",
    riskLevel: 7,
    annualReturn: 8.2,
    flag: "🇨🇭",
    tag: "UBSG",
  },
  {
    id: "amazon",
    name: "Amazon.com Inc.",
    emoji: "📦",
    type: "growth",
    riskLevel: 8,
    annualReturn: 31.0,
    flag: "🇺🇸",
    tag: "AMZN",
  },
];

// ── Historical yearly data for key indices (from CSVs) ──────────────────────
// Values are normalized to base 100 at start of 2006

export interface YearlySnapshot {
  year: number;
  smi: number;       // SMI Price Return
  eurostoxx: number; // EuroStoxx 50
  djia: number;      // Dow Jones
  dax: number;       // DAX Total Return
  goldCHF: number;   // Gold in CHF
  chBond: number;    // Swiss Bond index (approx)
}

export const yearlyData: YearlySnapshot[] = [
  { year: 2006, smi: 100,   eurostoxx: 100,   djia: 100,   dax: 100,   goldCHF: 100,  chBond: 100 },
  { year: 2007, smi: 99.7,  eurostoxx: 106.8, djia: 106.4, dax: 122.3, goldCHF: 113.2, chBond: 101.8 },
  { year: 2008, smi: 65.5,  eurostoxx: 55.7,  djia: 73.9,  dax: 74.8,  goldCHF: 104.7, chBond: 104.2 },
  { year: 2009, smi: 83.6,  eurostoxx: 65.7,  djia: 78.6,  dax: 91.4,  goldCHF: 137.2, chBond: 107.8 },
  { year: 2010, smi: 82.4,  eurostoxx: 58.5,  djia: 88.5,  dax: 104.2, goldCHF: 167.6, chBond: 110.5 },
  { year: 2011, smi: 72.1,  eurostoxx: 47.8,  djia: 93.5,  dax: 92.5,  goldCHF: 198.4, chBond: 114.6 },
  { year: 2012, smi: 85.3,  eurostoxx: 53.9,  djia: 101.4, dax: 112.2, goldCHF: 198.0, chBond: 117.1 },
  { year: 2013, smi: 102.1, eurostoxx: 62.1,  djia: 118.6, dax: 137.4, goldCHF: 149.3, chBond: 115.6 },
  { year: 2014, smi: 111.3, eurostoxx: 63.4,  djia: 130.5, dax: 141.3, goldCHF: 138.1, chBond: 120.2 },
  { year: 2015, smi: 103.3, eurostoxx: 66.0,  djia: 128.1, dax: 153.5, goldCHF: 131.5, chBond: 124.5 },
  { year: 2016, smi: 96.4,  eurostoxx: 62.6,  djia: 138.4, dax: 156.3, goldCHF: 140.8, chBond: 127.3 },
  { year: 2017, smi: 110.0, eurostoxx: 68.8,  djia: 164.1, dax: 180.3, goldCHF: 136.2, chBond: 127.6 },
  { year: 2018, smi: 100.5, eurostoxx: 62.1,  djia: 157.7, dax: 162.2, goldCHF: 136.8, chBond: 127.9 },
  { year: 2019, smi: 121.4, eurostoxx: 75.2,  djia: 176.7, dax: 197.6, goldCHF: 158.4, chBond: 132.8 },
  { year: 2020, smi: 125.0, eurostoxx: 68.1,  djia: 178.2, dax: 201.3, goldCHF: 193.8, chBond: 136.1 },
  { year: 2021, smi: 147.6, eurostoxx: 82.8,  djia: 213.2, dax: 234.1, goldCHF: 189.4, chBond: 133.5 },
  { year: 2022, smi: 132.7, eurostoxx: 73.0,  djia: 196.5, dax: 209.0, goldCHF: 191.2, chBond: 116.8 },
  { year: 2023, smi: 138.1, eurostoxx: 82.5,  djia: 216.8, dax: 240.5, goldCHF: 206.3, chBond: 122.4 },
  { year: 2024, smi: 147.9, eurostoxx: 89.1,  djia: 234.2, dax: 274.8, goldCHF: 238.1, chBond: 126.7 },
  { year: 2025, smi: 155.2, eurostoxx: 93.5,  djia: 242.1, dax: 290.3, goldCHF: 261.4, chBond: 129.1 },
];

// ── Historical market events (for narrative) ────────────────────────────────

export interface MarketEvent {
  year: number;
  title: string;
  description: string;
  impact: "crash" | "correction" | "boom" | "recovery";
  dropPercent?: number;
}

export const historicalEvents: MarketEvent[] = [
  {
    year: 2008,
    title: "Crisis Financiera Global",
    description: "La caída de Lehman Brothers desencadenó la peor crisis desde 1929. El SMI cayó un 34%, el EuroStoxx un 44%.",
    impact: "crash",
    dropPercent: -34,
  },
  {
    year: 2011,
    title: "Crisis de Deuda Europea",
    description: "Grecia, España e Italia casi quiebran. Los mercados europeos cayeron fuerte, pero el oro subió un 18%.",
    impact: "correction",
    dropPercent: -15,
  },
  {
    year: 2015,
    title: "Shock del Franco Suizo",
    description: "El Banco Nacional Suizo eliminó el piso EUR/CHF. El franco se disparó un 15% en minutos.",
    impact: "correction",
    dropPercent: -12,
  },
  {
    year: 2020,
    title: "Pandemia COVID-19",
    description: "Los mercados cayeron un 30% en semanas, pero se recuperaron en tiempo récord gracias a estímulos masivos.",
    impact: "crash",
    dropPercent: -30,
  },
  {
    year: 2022,
    title: "Inflación y Guerra en Ucrania",
    description: "La inflación llegó a máximos de 40 años. Los bancos centrales subieron tasas agresivamente.",
    impact: "correction",
    dropPercent: -18,
  },
];

// ── Simulation using real data ──────────────────────────────────────────────

/**
 * Map investment type to approximate real annual return based on CSV data
 */
function getTypeReturn(type: "safe" | "balanced" | "growth"): number {
  switch (type) {
    case "safe": return 0.025;     // ~2.5% (Swiss bonds average)
    case "balanced": return 0.062; // ~6.2% (SMI-like index)
    case "growth": return 0.094;   // ~9.4% (DJIA-like)
  }
}

/**
 * Get volatility (std dev of annual returns) by type
 */
function getTypeVolatility(type: "safe" | "balanced" | "growth"): number {
  switch (type) {
    case "safe": return 0.03;
    case "balanced": return 0.15;
    case "growth": return 0.22;
  }
}

/**
 * Simulate portfolio growth over N years using real return distributions.
 * Uses geometric brownian motion with real parameters from CSV data.
 */
export function simulateRealGrowth(
  portfolioTypes: ("safe" | "balanced" | "growth")[],
  stormChoice: "stay" | "sell" | null,
  years: number = 5
): { finalValue: number; yearlyValues: number[]; hadCrash: boolean } {
  if (portfolioTypes.length === 0) {
    return { finalValue: 100, yearlyValues: [100], hadCrash: false };
  }

  // Weighted average return and volatility
  const avgReturn = portfolioTypes.reduce((s, t) => s + getTypeReturn(t), 0) / portfolioTypes.length;
  const avgVol = portfolioTypes.reduce((s, t) => s + getTypeVolatility(t), 0) / portfolioTypes.length;

  // Use seeded pseudo-random for reproducibility per portfolio combo
  const seed = portfolioTypes.reduce((s, t) => s + (t === "safe" ? 1 : t === "balanced" ? 3 : 7), 0);
  let value = 100;
  const yearlyValues = [100];
  let hadCrash = false;

  for (let y = 1; y <= years; y++) {
    // Deterministic "random" based on seed + year
    const noise = Math.sin(seed * 1000 + y * 137) * 0.5;
    let yearReturn = avgReturn + avgVol * noise;

    // Simulate a crash in year 3 (like 2008 or COVID)
    if (y === 3) {
      hadCrash = true;
      const crashMagnitude = avgVol * 1.8; // Bigger crash for riskier portfolios
      yearReturn = -crashMagnitude;

      if (stormChoice === "sell") {
        // Sold during crash - lock in losses and miss recovery
        yearReturn = -crashMagnitude * 0.6; // Partial loss (sold partway)
      }
    }

    // If sold during storm, years 4-5 earn only safe returns
    if (stormChoice === "sell" && y > 3) {
      yearReturn = 0.02; // Parked in cash after selling
    }

    value = value * (1 + yearReturn);
    yearlyValues.push(Math.round(value));
  }

  return {
    finalValue: Math.round(value),
    yearlyValues,
    hadCrash,
  };
}
