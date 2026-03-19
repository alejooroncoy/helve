import { motion } from "framer-motion";
import TreeSVG from "./TreeSVG";

interface Props {
  result: number;
  onTryAgain: () => void;
  onAdjust: () => void;
}

const LoopScreen = ({ result, onTryAgain, onAdjust }: Props) => {
  const treeStage = result >= 130 ? "large" : result >= 115 ? "medium" : "small";

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <TreeSVG stage={treeStage} />

      <motion.div
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-serif text-foreground">Your garden is growing</h2>
        <p className="text-lg text-muted-foreground mt-2">
          Final value: <span className="font-medium text-primary">{result}</span>
        </p>
        <p className="text-muted-foreground mt-1">Want to see what happens with different choices?</p>
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 w-full max-w-xs"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.button
          className="bg-primary text-primary-foreground p-5 rounded-3xl text-lg font-medium shadow-lg"
          onClick={onTryAgain}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          🔄 Try Again
        </motion.button>
        <motion.button
          className="bg-card text-foreground p-5 rounded-3xl text-lg font-medium shadow-sm border border-border"
          onClick={onAdjust}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          🌿 Adjust Your Garden
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default LoopScreen;
