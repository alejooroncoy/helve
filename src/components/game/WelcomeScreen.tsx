import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const nunito = { fontFamily: "'Nunito', sans-serif" };

interface Props {
  onStart: () => void;
}

const WelcomeScreen = ({ onStart }: Props) => {
  return (
    <motion.div
      className="flex flex-col items-center min-h-screen bg-background px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.img
          src="/perspectiva1.png"
          alt="Helve"
          className="object-contain"
          style={{ width: 180 }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
        />

        <motion.div
          className="text-center"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h1 className="text-2xl text-foreground mb-2" style={{ ...nunito, fontWeight: 900 }}>
            Let's discover your financial profile
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed" style={{ ...nunito, fontWeight: 600 }}>
            Answer 3 quick questions so we can personalize your investment journey.
          </p>
        </motion.div>
      </div>

      <motion.div
        className="w-full pb-10"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <button
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white text-sm shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: "#5BB8F5", ...nunito, fontWeight: 900 }}
          onClick={onStart}
        >
          Let's go
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;
