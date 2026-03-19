import { useState } from "react";
import { motion } from "framer-motion";
import TreeSVG from "./TreeSVG";
import type { PortfolioSlot } from "@/game/types";
import { simulateGrowth } from "@/game/types";

interface Props {
  portfolio: PortfolioSlot[];
  stormChoice: "stay" | "sell" | null;
  onContinue: (result: number) => void;
}

const SimulationScreen = ({ portfolio, stormChoice, onContinue }: Props) => {
  const [simulated, setSimulated] = useState(false);
  const result = simulateGrowth(portfolio, stormChoice);

  const handleSimulate = () => {
    setSimulated(true);
  };

  const treeStage = result >= 130 ? "large" : result >= 115 ? "medium" : "small";

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <TreeSVG stage={simulated ? treeStage : "small"} />

      <motion.h2
        className="text-3xl font-serif text-center text-foreground"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {simulated ? "Your garden grew!" : "Time to grow"}
      </motion.h2>

      {!simulated ? (
        <motion.button
          className="bg-primary text-primary-foreground px-10 py-4 rounded-4xl text-lg font-medium shadow-lg"
          onClick={handleSimulate}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Simulate 5 Years
        </motion.button>
      ) : (
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-card p-6 rounded-3xl shadow-sm max-w-xs mx-auto space-y-2">
            <p className="text-muted-foreground text-sm">Your investment</p>
            <p className="text-4xl font-serif text-foreground">
              100 → <span className="text-primary">{result}</span>
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              If you did nothing → <span className="font-medium">100</span>
            </p>
          </div>

          <motion.button
            className="bg-primary text-primary-foreground px-10 py-4 rounded-4xl text-lg font-medium shadow-lg mt-4"
            onClick={() => onContinue(result)}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Continue
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SimulationScreen;
