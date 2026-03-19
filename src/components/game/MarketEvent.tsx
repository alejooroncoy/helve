import { useState } from "react";
import { motion } from "framer-motion";
import TreeSVG from "./TreeSVG";

interface Props {
  onChoice: (choice: "stay" | "sell") => void;
}

const MarketEvent = ({ onChoice }: Props) => {
  const [phase, setPhase] = useState<"storm" | "choice">("storm");

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {phase === "storm" ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <TreeSVG stage="medium" shaking storm />
          </motion.div>

          <motion.h2
            className="text-3xl font-serif text-center text-foreground"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            A storm hits the market
          </motion.h2>

          <motion.p
            className="text-muted-foreground text-center max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Your investments just dropped 20%. What do you do?
          </motion.p>

          <motion.div
            className="flex flex-col gap-3 w-full max-w-xs"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <motion.button
              className="bg-primary text-primary-foreground p-5 rounded-3xl text-lg font-medium shadow-lg"
              onClick={() => onChoice("stay")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              🧘 Stay calm
            </motion.button>
            <motion.button
              className="bg-card text-foreground p-5 rounded-3xl text-lg font-medium shadow-sm border border-border"
              onClick={() => onChoice("sell")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              🏃 Sell everything
            </motion.button>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  );
};

export default MarketEvent;
