import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const steps = [
  {
    number: 1,
    image: "/step1.png",
    title: "Set your profile",
    description: "Tell me how you like to play it — safe and steady, or bold and risky. I'll tailor your journey from there.",
  },
  {
    number: 2,
    image: "/step2.png",
    title: "Make your moves",
    description: "Buy, sell, and react to real market events. Every decision shapes your portfolio.",
  },
  {
    number: 3,
    image: "/step3.png",
    title: "Hatch your wealth",
    description: "Watch your nest grow over time. The more you play, the more you learn — and earn.",
  },
];

const nunito = { fontFamily: "'Nunito', sans-serif" };

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      localStorage.setItem("onboarding_done", "1");
      navigate("/", { replace: true });
    }
  };

  const step = steps[current];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-10">
      {/* Step dots */}
      <div className="flex gap-2 pt-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              backgroundColor: i === current ? "#5BB8F5" : "#d1d5db",
            }}
          />
        ))}
      </div>

      {/* Step image */}
      <motion.img
        key={current}
        src={step.image}
        alt={step.title}
        className="object-contain"
        style={{ width: 200 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
      />

      {/* Text + Button */}
      <div className="w-full flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="text-center"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2" style={{ ...nunito, fontWeight: 700 }}>
              Step {step.number} of {steps.length}
            </p>
            <h2 className="text-2xl text-foreground mb-3" style={{ ...nunito, fontWeight: 900 }}>
              {step.title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed" style={{ ...nunito, fontWeight: 600 }}>
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <motion.button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-white text-sm shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: "#5BB8F5", ...nunito, fontWeight: 900 }}
          whileTap={{ scale: 0.97 }}
        >
          {current < steps.length - 1 ? "Next" : "Let's go"}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};

export default Onboarding;
