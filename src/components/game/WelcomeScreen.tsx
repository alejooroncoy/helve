import { motion } from "framer-motion";

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
      {/* Center section */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
  
        <motion.img
        src="/perspectiva1.png"
        alt="Helve full"
        className="object-contain"
        style={{ width: 220, marginBottom: -110 }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
      />

        {/* Name & tagline */}
        <motion.div
          className="text-center"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h1 className="font-serif" style={{ fontSize: "2.8rem", fontWeight: 900, color: "#5BB8F5" }}>
            HELVE
          </h1>
          <p className="text-muted-foreground text-lg mt-1">Learn investing by doing.</p>
        </motion.div>
      </div>

      {/* Character full body */}
      

      {/* Bottom buttons */}
      <motion.div
        className="w-full flex flex-col gap-3 pb-10"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <button
          className="w-full py-4 rounded-2xl font-serif tracking-widest text-sm shadow-md active:scale-95 transition-transform text-white"
          style={{ backgroundColor: "#5BB8F5", fontWeight: 900 }}
          onClick={onStart}
        >
          GET STARTED
        </button>
        <button
          className="w-full py-4 rounded-2xl border-2 border-border text-foreground font-serif tracking-widest text-sm active:scale-95 transition-transform"
          style={{ fontWeight: 900 }}
        >
          I ALREADY HAVE AN ACCOUNT
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;
