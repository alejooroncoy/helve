import { motion } from "framer-motion";
import type { RiskProfile } from "@/game/types";

interface Props {
  profile: RiskProfile;
  onContinue: () => void;
}

const profileData: Record<RiskProfile, { emoji: string; title: string; desc: string }> = {
  conservative: {
    emoji: "🛡️",
    title: "You are Conservative",
    desc: "You prefer safety and steady, predictable growth.",
  },
  balanced: {
    emoji: "🌿",
    title: "You are Balanced",
    desc: "You prefer steady growth with moderate risk.",
  },
  growth: {
    emoji: "🌳",
    title: "You are a Grower",
    desc: "You're comfortable with risk for bigger rewards.",
  },
};

const ProfileResult = ({ profile, onContinue }: Props) => {
  const data = profileData[profile];

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.span
        className="text-7xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
      >
        {data.emoji}
      </motion.span>

      <motion.div
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-4xl font-serif text-foreground">{data.title}</h2>
        <p className="text-lg text-muted-foreground mt-3 max-w-xs">{data.desc}</p>
      </motion.div>

      <motion.button
        className="bg-primary text-primary-foreground px-10 py-4 rounded-4xl text-lg font-medium shadow-lg"
        onClick={onContinue}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Continue to Your Garden
      </motion.button>
    </motion.div>
  );
};

export default ProfileResult;
