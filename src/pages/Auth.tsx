import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const nunito = { fontFamily: "'Nunito', sans-serif" };

const Auth = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/onboarding");
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="text-center mb-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <img src="/perspectiva1.png" alt="Helve" className="mx-auto mb-0 object-contain" style={{ width: 160 }} />
        <h1 className="text-3xl text-foreground" style={{ ...nunito, fontWeight: 900 }}>
          Helve
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto" style={{ ...nunito, fontWeight: 600 }}>
          Learn to invest by playing. Hatch your golden eggs.
        </p>
      </motion.div>

      <motion.button
        onClick={handleStart}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white text-sm shadow-md active:scale-95 transition-transform"
        style={{ backgroundColor: "#5BB8F5", ...nunito, fontWeight: 900 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Get Started
        <ChevronRight className="w-4 h-4" />
      </motion.button>

      <p className="text-[10px] text-muted-foreground mt-8 text-center max-w-xs" style={nunito}>
        By continuing, you agree that this is an educational game and not real financial advice.
      </p>
    </motion.div>
  );
};

export default Auth;
