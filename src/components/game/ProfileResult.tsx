import { motion } from "framer-motion";
import type { RiskProfile } from "@/game/types";

interface Props {
  profile: RiskProfile;
  onContinue: () => void;
}

const profileData: Record<RiskProfile, { title: string; desc: string }> = {
  conservative: {
    title: "You are Conservative",
    desc: "You prefer safety and steady, predictable growth.",
  },
  balanced: {
    title: "You are Balanced",
    desc: "You prefer steady growth with moderate risk.",
  },
  growth: {
    title: "You are a Grower",
    desc: "You're comfortable with risk for bigger rewards.",
  },
};

const nunito = { fontFamily: "'Nunito', sans-serif" };

const ProfileResult = ({ profile, onContinue }: Props) => {
  const data = profileData[profile];

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.img
        src="/grow.png"
        alt="profile"
        className="object-contain"
        style={{ width: 200, marginBottom: -40 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
      />

      <motion.div
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-4xl text-foreground" style={{ ...nunito, fontWeight: 900 }}>{data.title}</h2>
        <p className="text-lg text-muted-foreground mt-3 max-w-xs" style={{ ...nunito, fontWeight: 600 }}>{data.desc}</p>
      </motion.div>

      <motion.button
        className="text-white px-10 py-4 rounded-4xl text-lg shadow-lg"
        style={{ backgroundColor: "#5BB8F5", ...nunito, fontWeight: 700 }}
        onClick={onContinue}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Start Building Your Nest
      </motion.button>
    </motion.div>
  );
};

export default ProfileResult;
