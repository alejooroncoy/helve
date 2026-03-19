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
  riskLevel: number; // 1-10 computed from volatility
  latestPrice: number;
  firstPrice: number;
  totalReturn: number; // total % since inception
}

export interface MonthlyPrice {
  date: string;
  price: number;
}

/**
 * Compute risk level (1-10) from annual volatility
 */
function volToRisk(vol: number): number {
  if (vol <= 3) return 1;
  if (vol <= 6) return 2;
  if (vol <= 10) return 3;
  if (vol <= 15) return 4;
  if (vol <= 20) return 5;
  if (vol <= 30) return 6;
  if (vol <= 45) return 7;
  if (vol <= 60) return 8;
  if (vol <= 80) return 9;
  return 10;
}

/**
 * Fetch instrument stats with real annual returns and volatility computed from market_prices
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
        // Fetch instruments
        const { data: instruments } = await supabase
          .from("instruments")
          .select("*")
          .in("id", instrumentIds);

        if (!instruments) return;

        // For each instrument, fetch yearly first/last prices to compute returns
        const result: Record<string, InstrumentStats> = {};

        for (const inst of instruments) {
          // Get first and last price
          const [{ data: firstRow }, { data: lastRow }] = await Promise.all([
            supabase
              .from("market_prices")
              .select("price, date")
              .eq("instrument_id", inst.id)
              .order("date", { ascending: true })
              .limit(1),
            supabase
              .from("market_prices")
              .select("price, date")
              .eq("instrument_id", inst.id)
              .order("date", { ascending: false })
              .limit(1),
          ]);

          const firstPrice = firstRow?.[0]?.price ?? 100;
          const latestPrice = lastRow?.[0]?.price ?? 100;
          const firstDate = firstRow?.[0]?.date;
          const lastDate = lastRow?.[0]?.date;

          // Compute years between
          const years = firstDate && lastDate
            ? (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            : 1;

          // CAGR
          const totalReturn = firstPrice > 0 ? ((latestPrice / firstPrice) - 1) * 100 : 0;
          const cagr = firstPrice > 0 && years > 0
            ? (Math.pow(latestPrice / firstPrice, 1 / years) - 1) * 100
            : 0;

          // Fetch monthly prices for volatility computation (sample every ~21 trading days)
          const { data: allPrices } = await supabase
            .from("market_prices")
            .select("price, date")
            .eq("instrument_id", inst.id)
            .order("date", { ascending: true });

          let volatility = 15; // default
          if (allPrices && allPrices.length > 50) {
            // Sample monthly (~21 trading days)
            const monthlyPrices: number[] = [];
            for (let i = 0; i < allPrices.length; i += 21) {
              monthlyPrices.push(allPrices[i].price);
            }
            // Compute monthly returns
            const monthlyReturns: number[] = [];
            for (let i = 1; i < monthlyPrices.length; i++) {
              if (monthlyPrices[i - 1] > 0) {
                monthlyReturns.push((monthlyPrices[i] / monthlyPrices[i - 1]) - 1);
              }
            }
            // Annualized volatility
            if (monthlyReturns.length > 2) {
              const mean = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length;
              const variance = monthlyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (monthlyReturns.length - 1);
              volatility = Math.sqrt(variance) * Math.sqrt(12) * 100;
            }
          }

          result[inst.id] = {
            id: inst.id,
            name: inst.name,
            ticker: inst.ticker,
            category: inst.category,
            currency: inst.currency,
            avgAnnualReturn: Math.round(cagr * 10) / 10,
            volatility: Math.round(volatility * 10) / 10,
            riskLevel: volToRisk(volatility),
            latestPrice: Math.round(latestPrice * 100) / 100,
            firstPrice: Math.round(firstPrice * 100) / 100,
            totalReturn: Math.round(totalReturn * 10) / 10,
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
 * Fetch monthly price series for simulation chart
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

        for (const id of instrumentIds) {
          const { data } = await supabase
            .from("market_prices")
            .select("price, date")
            .eq("instrument_id", id)
            .order("date", { ascending: true });

          if (data && data.length > 0) {
            // Sample monthly
            const monthly: MonthlyPrice[] = [];
            let lastMonth = "";
            for (const row of data) {
              const month = row.date.substring(0, 7);
              if (month !== lastMonth) {
                monthly.push({ date: row.date, price: row.price });
                lastMonth = month;
              }
            }
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
