import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, Users, ChevronRight, ArrowRight, X, Map, Lock, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const nunito = { fontFamily: "'Nunito', sans-serif" };
const CELESTE = "#5BB8F5";

const MULTIPLAYER_STEPS = [
  { icon: Users, imgKey: "step1" },
  { icon: Briefcase, imgKey: "step2" },
  { icon: ChevronRight, imgKey: "step3" },
];

const Hub = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const steps = t("hub.multiplayerSteps", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  const handleMultiplayer = () => {
    setOnboardingStep(0);
    setShowOnboarding(true);
  };

  const handleOnboardingNext = () => {
    if (onboardingStep < steps.length - 1) {
      setOnboardingStep((s) => s + 1);
    } else {
      setShowOnboarding(false);
      navigate("/multiplayer");
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Top: language switcher + title */}
      <div className="flex flex-col items-center text-center px-6 pt-6 pb-2">
        <LanguageSwitcher />
        {(() => {
          const meta = user?.user_metadata;
          const isDemo = user?.email === "demo@helve.app";
          const displayName = isDemo ? null : (meta?.full_name || meta?.name || meta?.email?.split("@")[0] || null);
          const firstName = displayName ? displayName.split(" ")[0] : t("hub.guest");
          return (
            <h1 className="text-2xl text-foreground mt-4" style={{ ...nunito, fontWeight: 900 }}>
              {t("hub.greeting")}, {firstName}
            </h1>
          );
        })()}
        <p className="text-xs text-muted-foreground" style={nunito}>
          {t("hub.subtitle")}
        </p>
      </div>

      {/* Cards — centered in remaining space */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-6 max-w-md mx-auto w-full">
        <div className="flex flex-col gap-4">
        {/* Portfolio card */}
        <motion.button
          className="w-full rounded-3xl p-6 text-left relative overflow-hidden border-2 border-transparent"
          style={{
            background: `linear-gradient(135deg, ${CELESTE}15, ${CELESTE}08)`,
            borderColor: `${CELESTE}40`,
          }}
          onClick={() => navigate("/portfolio")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${CELESTE}20` }}
            >
              <Briefcase className="w-7 h-7" style={{ color: CELESTE }} />
            </div>
            <div className="flex-1">
              <h2
                className="text-lg text-foreground"
                style={{ ...nunito, fontWeight: 800 }}
              >
                {t("hub.portfolio.title")}
              </h2>
              <p
                className="text-xs text-muted-foreground mt-0.5"
                style={nunito}
              >
                {t("hub.portfolio.desc")}
              </p>
            </div>
            <ArrowRight
              className="w-5 h-5 flex-shrink-0"
              style={{ color: CELESTE }}
            />
          </div>
        </motion.button>

        {/* Multiplayer card */}
        <motion.button
          className="w-full rounded-3xl p-6 text-left relative overflow-hidden border-2 border-transparent"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.05))",
            borderColor: "hsl(var(--accent) / 0.3)",
          }}
          onClick={handleMultiplayer}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "hsl(var(--accent) / 0.15)" }}
            >
              <Users
                className="w-7 h-7"
                style={{ color: "hsl(var(--accent))" }}
              />
            </div>
            <div className="flex-1">
              <h2
                className="text-lg text-foreground"
                style={{ ...nunito, fontWeight: 800 }}
              >
                {t("hub.multiplayer.title")}
              </h2>
              <p
                className="text-xs text-muted-foreground mt-0.5"
                style={nunito}
              >
                {t("hub.multiplayer.desc")}
              </p>
            </div>
            <ArrowRight
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "hsl(var(--accent))" }}
            />
          </div>
        </motion.button>

        {/* Map card — coming soon */}
        <div
          className="w-full rounded-3xl p-6 text-left relative overflow-hidden border-2 opacity-60 cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #4ade8015, #4ade8008)",
            borderColor: "#4ade8040",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#4ade8020" }}
            >
              <Map className="w-7 h-7" style={{ color: "#4ade80" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg text-foreground" style={{ ...nunito, fontWeight: 800 }}>
                {t("hub.map.title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5" style={nunito}>
                {t("hub.map.desc")}
              </p>
            </div>
            <Lock className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
          </div>
        </div>
        </div>
      </div>{/* end centered wrapper */}

      {/* Multiplayer onboarding modal */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-3xl p-6 max-w-sm w-full relative"
              style={{ boxShadow: "0 20px 60px hsl(0 0% 0% / 0.2)" }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
            >
              {/* Close */}
              <button
                onClick={() => setShowOnboarding(false)}
                className="absolute top-4 right-4"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-6">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      backgroundColor:
                        i === onboardingStep
                          ? CELESTE
                          : "hsl(var(--muted-foreground) / 0.2)",
                      width: i === onboardingStep ? 20 : 8,
                    }}
                  />
                ))}
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingStep}
                  className="text-center"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Icon */}
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                    style={{ backgroundColor: `${CELESTE}15` }}
                  >
                    {(() => {
                      const Icon = MULTIPLAYER_STEPS[onboardingStep]?.icon || Users;
                      return (
                        <Icon className="w-8 h-8" style={{ color: CELESTE }} />
                      );
                    })()}
                  </div>

                  <h3
                    className="text-lg text-foreground mb-2"
                    style={{ ...nunito, fontWeight: 800 }}
                  >
                    {steps[onboardingStep]?.title}
                  </h3>
                  <p
                    className="text-sm text-muted-foreground leading-relaxed"
                    style={nunito}
                  >
                    {steps[onboardingStep]?.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Next button */}
              <motion.button
                className="w-full mt-6 py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
                style={{ ...nunito, backgroundColor: CELESTE }}
                onClick={handleOnboardingNext}
                whileTap={{ scale: 0.97 }}
              >
                {onboardingStep < steps.length - 1
                  ? t("hub.next")
                  : t("hub.letsPlay")}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-6 pb-6 pt-2">
        <p
          className="text-[10px] text-muted-foreground text-center"
          style={nunito}
        >
          {t("hub.footer")}
        </p>
      </div>
    </motion.div>
  );
};

export default Hub;
