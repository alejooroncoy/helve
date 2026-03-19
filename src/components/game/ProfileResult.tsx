import { motion } from "framer-motion";
import type { RiskProfile } from "@/game/types";
import { useTranslation } from "react-i18next";

interface Props {
  profile: RiskProfile;
  onContinue: () => void;
}

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

const mascotImages: Record<RiskProfile, string> = {
  conservative: "/mascot-conservative.png",
  balanced: "/mascot-balanced.png",
  growth: "/mascot-growth.png",
};

const ProfileResult = ({ profile, onContinue }: Props) => {
  const { t } = useTranslation();
  const title = t(`profile.${profile}.title`);
  const card = t(`profile.${profile}.card`);
  const mascot = mascotImages[profile];

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        <motion.img
          src={mascot}
          alt={title}
          className="object-contain"
          style={{ width: 220, height: 220 }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
        />

        <motion.div
          className="rounded-3xl p-6 w-full max-w-sm text-center"
          style={{ backgroundColor: "hsl(var(--card))", border: `2px solid hsl(var(--border))` }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl text-foreground mb-3" style={{ ...nunito, fontWeight: 900 }}>
            {title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed" style={{ ...nunito, fontWeight: 600 }}>
            {card}
          </p>
        </motion.div>
      </div>

      <div className="px-5 py-8">
        <motion.button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl tracking-widest text-sm text-white"
          style={{ ...nunito, backgroundColor: CELESTE, fontWeight: 900 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileTap={{ scale: 0.97 }}
        >
          {t("profile.buildMyNest")}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileResult;
