import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const nunito = { fontFamily: "'Nunito', sans-serif" };

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps = t("onboarding.steps", { returnObjects: true }) as { title: string; description: string }[];
  const totalSteps = steps.length;

  const handleNext = () => {
    if (current < totalSteps - 1) {
      setCurrent((c) => c + 1);
    } else {
      localStorage.setItem("onboarding_done", "1");
      navigate("/", { replace: true });
    }
  };

  const images = ["/step1.png", "/step2.png", "/step3.png"];
  const step = steps[current];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-10">
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

      <motion.img
        key={current}
        src={images[current]}
        alt={step.title}
        className="object-contain"
        style={{ width: 200 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
      />

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
              {t("onboarding.step", { current: current + 1, total: totalSteps })}
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
          {current < totalSteps - 1 ? t("onboarding.next") : t("onboarding.letsGo")}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};

export default Onboarding;
