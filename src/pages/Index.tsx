import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/useUserProgress";
import GameFlow from "@/components/game/GameFlow";

const Index = () => {
  const { loadProgress } = useUserProgress();
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    loadProgress().then((p) => {
      if (p?.onboarding_completed) {
        setOnboarded(true);
      }
      setChecking(false);
    });
  }, [loadProgress]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-4xl animate-pulse">🪺</span>
      </div>
    );
  }

  // Already onboarded → go to panel
  if (onboarded) return <Navigate to="/panel" replace />;

  // New user → onboarding
  return <GameFlow />;
};

export default Index;
