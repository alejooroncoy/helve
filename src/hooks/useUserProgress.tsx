import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Investment, RiskProfile } from "@/game/types";

export interface UserProgress {
  risk_score: number;
  risk_scores: number[];
  risk_profile: RiskProfile;
  portfolio: Investment[];
  game_step: string;
  storm_choice: string | null;
  simulation_result: number;
  onboarding_completed: boolean;
}

export function useUserProgress() {
  const { user } = useAuth();

  const loadProgress = useCallback(async (): Promise<UserProgress | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) return null;

    return {
      risk_score: data.risk_score ?? 0,
      risk_scores: (data.risk_scores as unknown as number[]) ?? [],
      risk_profile: (data.risk_profile as RiskProfile) ?? "balanced",
      portfolio: (data.portfolio as unknown as Investment[]) ?? [],
      game_step: data.game_step ?? "welcome",
      storm_choice: data.storm_choice ?? null,
      simulation_result: data.simulation_result ?? 0,
      onboarding_completed: data.onboarding_completed ?? false,
    };
  }, [user]);

  const saveProgress = useCallback(
    async (progress: Partial<UserProgress>) => {
      if (!user) return;

      const updateData: Record<string, unknown> = {};
      if (progress.risk_score !== undefined) updateData.risk_score = progress.risk_score;
      if (progress.risk_scores !== undefined) updateData.risk_scores = progress.risk_scores;
      if (progress.risk_profile !== undefined) updateData.risk_profile = progress.risk_profile;
      if (progress.portfolio !== undefined) updateData.portfolio = progress.portfolio;
      if (progress.game_step !== undefined) updateData.game_step = progress.game_step;
      if (progress.storm_choice !== undefined) updateData.storm_choice = progress.storm_choice;
      if (progress.simulation_result !== undefined) updateData.simulation_result = progress.simulation_result;
      if (progress.onboarding_completed !== undefined) updateData.onboarding_completed = progress.onboarding_completed;

      await supabase
        .from("user_progress")
        .update(updateData)
        .eq("user_id", user.id);
    },
    [user]
  );

  return { loadProgress, saveProgress };
}
