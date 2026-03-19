import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Investment } from "@/game/types";

export interface NestPortfolio {
  id: string;
  name: string;
  portfolio: Investment[];
  allocations: Record<string, number>;
  balance: number;
  order_index: number;
}

export function useUserPortfolios() {
  const { user } = useAuth();
  const [nests, setNests] = useState<NestPortfolio[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setNests([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("user_portfolios")
      .select("*")
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });

    if (error || !data) { setNests([]); setLoading(false); return; }

    setNests(
      data.map((r: any) => ({
        id: r.id,
        name: r.name ?? "My Nest",
        portfolio: (r.portfolio as unknown as Investment[]) ?? [],
        allocations: (r.allocations as Record<string, number>) ?? {},
        balance: r.balance ?? 1000,
        order_index: r.order_index ?? 0,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createNest = useCallback(async (name: string): Promise<NestPortfolio | null> => {
    if (!user) return null;
    const order_index = nests.length;
    const { data, error } = await supabase
      .from("user_portfolios")
      .insert({ user_id: user.id, name, order_index })
      .select()
      .single();
    if (error || !data) return null;
    const newNest: NestPortfolio = {
      id: data.id,
      name: data.name,
      portfolio: [],
      allocations: {},
      balance: 1000,
      order_index,
    };
    setNests((prev) => [...prev, newNest]);
    return newNest;
  }, [user, nests.length]);

  const updateNest = useCallback(async (id: string, patch: Partial<Pick<NestPortfolio, "name" | "portfolio" | "allocations" | "balance">>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.portfolio !== undefined) updateData.portfolio = patch.portfolio;
    if (patch.allocations !== undefined) updateData.allocations = patch.allocations;
    if (patch.balance !== undefined) updateData.balance = patch.balance;
    await supabase.from("user_portfolios").update(updateData).eq("id", id).eq("user_id", user.id);
    setNests((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, [user]);

  const deleteNest = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("user_portfolios").delete().eq("id", id).eq("user_id", user.id);
    setNests((prev) => prev.filter((n) => n.id !== id));
  }, [user]);

  return { nests, loading, createNest, updateNest, deleteNest, reload: load };
}
