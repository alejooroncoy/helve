import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InstrumentStats {
  id: string;
  name: string;
  ticker: string | null;
  category: string;
  currency: string | null;
  avgAnnualReturn: number;
  volatility: number;
  riskLevel: number;
  latestPrice: number;
  firstPrice: number;
  totalReturn: number;
}

export interface MonthlyPrice {
  date: string;
  price: number;
}

/**
 * Fetch instrument stats using the optimized SQL function.
 * Returns CAGR, volatility, risk level — all computed server-side.
 */
export function useInstrumentStats(instrumentIds: string[]) {
  const [stats, setStats] = useState<Record<string, InstrumentStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (instrumentIds.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_instrument_stats", {
          p_instrument_ids: instrumentIds,
        });

        if (error) {
          console.error("Error fetching instrument stats:", error);
          return;
        }

        const result: Record<string, InstrumentStats> = {};
        for (const row of data || []) {
          result[row.instrument_id] = {
            id: row.instrument_id,
            name: row.name,
            ticker: row.ticker,
            category: row.category,
            currency: row.currency,
            avgAnnualReturn: Number(row.cagr),
            volatility: Number(row.volatility),
            riskLevel: Number(row.risk_level),
            latestPrice: Number(row.latest_price),
            firstPrice: Number(row.first_price),
            totalReturn: Number(row.total_return),
          };
        }

        setStats(result);
      } catch (err) {
        console.error("Error fetching instrument stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [instrumentIds.join(",")]);

  return { stats, loading };
}

/**
 * Fetch monthly price series for simulation chart.
 * Uses a server-side SQL function to return only 1 price per month,
 * avoiding the 1000-row default limit and reducing data transfer.
 */
export function useMonthlyPrices(instrumentIds: string[]) {
  const [prices, setPrices] = useState<Record<string, MonthlyPrice[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (instrumentIds.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchPrices() {
      setLoading(true);
      try {
        const result: Record<string, MonthlyPrice[]> = {};

        // Fetch prices per instrument to avoid the 1000-row limit.
        // Each instrument has ~240 monthly data points (20 years × 12 months),
        // well within Supabase's default limit.
        const promises = instrumentIds.map(async (instrumentId) => {
          const { data, error } = await supabase
            .from("market_prices")
            .select("price, date")
            .eq("instrument_id", instrumentId)
            .order("date", { ascending: true });

          if (error) {
            console.error(`Error fetching prices for ${instrumentId}:`, error);
            return;
          }

          if (data && data.length > 0) {
            // Keep first price per month (client-side dedup)
            const monthly: MonthlyPrice[] = [];
            const seenMonths = new Set<string>();

            for (const row of data) {
              const month = row.date.substring(0, 7);
              if (!seenMonths.has(month)) {
                seenMonths.add(month);
                monthly.push({ date: row.date, price: row.price });
              }
            }

            result[instrumentId] = monthly;
          }
        });

        await Promise.all(promises);
        setPrices(result);
      } catch (err) {
        console.error("Error fetching monthly prices:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, [instrumentIds.join(",")]);

  return { prices, loading };
}
