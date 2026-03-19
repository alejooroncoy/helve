import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import type { GameStep, GameState, AssetAllocation } from "@/game/types";
import { initialGameState, getProfile } from "@/game/types";
import { useUserProgress } from "@/hooks/useUserProgress";
import WelcomeScreen from "./WelcomeScreen";
import RiskScreen from "./RiskScreen";
import ProfileResult from "./ProfileResult";
import AssetAllocationBuilder from "./AssetAllocationBuilder";
import MarketEvent from "./MarketEvent";
import SimulationScreen from "./SimulationScreen";
import LearningMoment from "./LearningMoment";
import LoopScreen from "./LoopScreen";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const riskSteps: GameStep[] = ["risk-1", "risk-2", "risk-3"];

const GameFlow = () => {
  const [state, setState] = useState<GameState>(initialGameState);
  const navigate = useNavigate();
  const { saveProgress } = useUserProgress();

  const go = useCallback((step: GameStep, patch?: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...patch, step }));
  }, []);

  const handleRiskAnswer = (questionIndex: number, score: number) => {
    const newScores = [...state.riskScores, score];
    const newTotal = newScores.reduce((a, b) => a + b, 0);
    const nextStep = riskSteps[questionIndex + 1];
    if (nextStep) {
      go(nextStep, { riskScore: newTotal, riskScores: newScores });
    } else {
      const profile = getProfile(newTotal);
      go("profile-result", { riskScore: newTotal, riskScores: newScores, profile });
      saveProgress({
        risk_score: newTotal,
        risk_scores: newScores,
        risk_profile: profile,
        game_step: "profile-result",
      });
    }
  };

  const handleRiskBack = (questionIndex: number) => {
    if (questionIndex === 0) {
      go("welcome", { riskScore: 0, riskScores: [] });
    } else {
      const prevScores = state.riskScores.slice(0, questionIndex - 1);
      const prevTotal = prevScores.reduce((a, b) => a + b, 0);
      go(riskSteps[questionIndex - 1], { riskScore: prevTotal, riskScores: prevScores });
    }
  };

  const handleProfileContinue = async () => {
    await saveProgress({
      onboarding_completed: true,
      risk_profile: state.profile,
      risk_score: state.riskScore,
      risk_scores: state.riskScores,
    });
    navigate("/panel");
  };

  const handleAllocationComplete = (allocation: AssetAllocation) => {
    go("market-event", { assetAllocation: allocation });
  };

  const resetFull = () => setState(initialGameState);
  const resetToPortfolio = () =>
    setState((prev) => ({
      ...prev,
      step: "portfolio",
      assetAllocation: initialGameState.assetAllocation,
      stormChoice: null,
      simulationResult: 0,
    }));

  return (
    <div className="min-h-screen bg-background relative">
      <LanguageSwitcher className="absolute top-4 right-4 z-50" />
      <AnimatePresence mode="wait">
        {state.step === "welcome" && (
          <WelcomeScreen key="welcome" onStart={() => go("risk-1")} />
        )}

        {state.step === "risk-1" && (
          <RiskScreen key="risk-1" questionIndex={0} onAnswer={(s) => handleRiskAnswer(0, s)} onBack={() => handleRiskBack(0)} />
        )}
        {state.step === "risk-2" && (
          <RiskScreen key="risk-2" questionIndex={1} onAnswer={(s) => handleRiskAnswer(1, s)} onBack={() => handleRiskBack(1)} />
        )}
        {state.step === "risk-3" && (
          <RiskScreen key="risk-3" questionIndex={2} onAnswer={(s) => handleRiskAnswer(2, s)} onBack={() => handleRiskBack(2)} />
        )}

        {state.step === "profile-result" && (
          <ProfileResult key="profile" profile={state.profile} onContinue={handleProfileContinue} />
        )}

        {state.step === "portfolio" && (
          <AssetAllocationBuilder
            key="portfolio"
            profile={state.profile}
            onComplete={handleAllocationComplete}
          />
        )}

        {state.step === "market-event" && (
          <MarketEvent
            key="market"
            onChoice={(c) => go("simulation", { stormChoice: c })}
          />
        )}

        {state.step === "simulation" && (
          <SimulationScreen
            key="simulation"
            allocation={state.assetAllocation}
            profile={state.profile}
            stormChoice={state.stormChoice}
            onContinue={(r) => go("learning", { simulationResult: r })}
          />
        )}

        {state.step === "learning" && (
          <LearningMoment
            key="learning"
            allocation={state.assetAllocation}
            profile={state.profile}
            stormChoice={state.stormChoice}
            result={state.simulationResult}
            onContinue={() => go("loop")}
          />
        )}

        {state.step === "loop" && (
          <LoopScreen
            key="loop"
            result={state.simulationResult}
            onTryAgain={resetFull}
            onAdjust={resetToPortfolio}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameFlow;
