/**
 * Category-based investment definitions for the game.
 * Each "investment" represents an asset category, not an individual stock.
 * Financial stats are loaded from DB via useInstrumentStats.
 */

import type { Investment } from "./types";
import { ASSET_CLASSES } from "./types";

// Build category-based investments from ASSET_CLASSES
export const realInvestments: Investment[] = ASSET_CLASSES.map(cls => {
  let type: "safe" | "balanced" | "growth";
  if (cls.riskWeight <= 3) type = "safe";
  else if (cls.riskWeight <= 6) type = "balanced";
  else type = "growth";

  // Default annual returns (fallback before DB enrichment)
  const defaultReturns: Record<string, number> = {
    bonds: 2.5,
    equity: 6.0,
    gold: 7.0,
    fx: 3.5,
    swissStocks: 5.8,
    usStocks: 9.0,
    crypto: 15.0,
    cleanEnergy: 8.0,
  };

  return {
    id: cls.key,
    name: cls.key, // Will be translated via t(`allocation.classes.${cls.key}`)
    emoji: cls.emoji,
    type,
    riskLevel: cls.riskWeight,
    annualReturn: defaultReturns[cls.key] ?? 5.0,
  };
});
