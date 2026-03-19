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
 * Only fetches 1 price per month (first of each month) — much lighter than all daily prices.
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

        // Fetch all prices for requested instruments in one query, ordered
        const { data, error } = await supabase
          .from("market_prices")
          .select("instrument_id, price, date")
          .in("instrument_id", instrumentIds)
          .order("date", { ascending: true });

        if (error) {
          console.error("Error fetching prices:", error);
          return;
        }

        if (data) {
          // Group by instrument, keep first price per month
          const byInstrument: Record<string, { date: string; price: number }[]> = {};
          const seenMonths: Record<string, Set<string>> = {};

          for (const row of data) {
            const month = row.date.substring(0, 7);
            if (!byInstrument[row.instrument_id]) {
              byInstrument[row.instrument_id] = [];
              seenMonths[row.instrument_id] = new Set();
            }
            if (!seenMonths[row.instrument_id].has(month)) {
              seenMonths[row.instrument_id].add(month);
              byInstrument[row.instrument_id].push({ date: row.date, price: row.price });
            }
          }

          for (const [id, monthly] of Object.entries(byInstrument)) {
            result[id] = monthly;
          }
        }

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
