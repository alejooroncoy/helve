import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { GameStep, PortfolioSlot, Investment, GameState } from "@/game/types";
import { initialGameState, getProfile } from "@/game/types";
import WelcomeScreen from "./WelcomeScreen";
import RiskScreen from "./RiskScreen";
import ProfileResult from "./ProfileResult";
import PortfolioBuilder from "./PortfolioBuilder";
import MarketEvent from "./MarketEvent";
import SimulationScreen from "./SimulationScreen";
import LearningMoment from "./LearningMoment";
import LoopScreen from "./LoopScreen";

const riskSteps: GameStep[] = ["risk-1", "risk-2", "risk-3"];

const GameFlow = () => {
  const [state, setState] = useState<GameState>(initialGameState);

  const go = useCallback((step: GameStep, patch?: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...patch, step }));
  }, []);

  const handleRiskAnswer = (questionIndex: number, score: number) => {
    const newScore = state.riskScore + score;
    const nextStep = riskSteps[questionIndex + 1];
    if (nextStep) {
      go(nextStep, { riskScore: newScore });
    } else {
      go("profile-result", { riskScore: newScore, profile: getProfile(newScore) });
    }
  };

  const resetFull = () => setState(initialGameState);
  const resetToPortfolio = () =>
    setState((prev) => ({
      ...prev,
      step: "portfolio",
      portfolio: [],
      portfolioSlots: [],
      stormChoice: null,
      simulationResult: 0,
    }));

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {state.step === "welcome" && (
          <WelcomeScreen key="welcome" onStart={() => go("risk-1")} />
        )}

        {state.step === "risk-1" && (
          <RiskScreen key="risk-1" questionIndex={0} onAnswer={(s) => handleRiskAnswer(0, s)} />
        )}
        {state.step === "risk-2" && (
          <RiskScreen key="risk-2" questionIndex={1} onAnswer={(s) => handleRiskAnswer(1, s)} />
        )}
        {state.step === "risk-3" && (
          <RiskScreen key="risk-3" questionIndex={2} onAnswer={(s) => handleRiskAnswer(2, s)} />
        )}

        {state.step === "profile-result" && (
          <ProfileResult key="profile" profile={state.profile} onContinue={() => go("portfolio")} />
        )}

        {state.step === "portfolio" && (
          <PortfolioBuilder
            key="portfolio"
            onComplete={(p: PortfolioSlot[]) => go("market-event", { portfolio: p })}
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
            portfolio={state.portfolio}
            stormChoice={state.stormChoice}
            onContinue={(r) => go("learning", { simulationResult: r })}
          />
        )}

        {state.step === "learning" && (
          <LearningMoment
            key="learning"
            portfolio={state.portfolio}
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
