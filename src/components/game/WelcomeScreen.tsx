import { motion } from "framer-motion";
import TreeSVG from "./TreeSVG";

interface Props {
  onStart: () => void;
}

const WelcomeScreen = ({ onStart }: Props) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <TreeSVG stage="seed" />
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <h1 className="text-6xl font-serif tracking-tight text-foreground">HELVE</h1>
        <p className="text-lg text-muted-foreground mt-3">Learn investing by doing</p>
      </motion.div>

      <motion.button
        className="bg-primary text-primary-foreground px-10 py-4 rounded-4xl text-lg font-medium shadow-lg hover:shadow-xl transition-shadow"
        onClick={onStart}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Plant Your First Seed
      </motion.button>
    </motion.div>
  );
};

export default WelcomeScreen;
