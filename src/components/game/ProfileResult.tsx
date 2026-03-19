import { motion } from "framer-motion";
import type { RiskProfile } from "@/game/types";

interface Props {
  profile: RiskProfile;
  onContinue: () => void;
}

const profileData: Record<RiskProfile, { title: string; desc: string; stat: string }> = {
  conservative: {
    title: "¡Tu pajarito es un Guardián Prudente! 🛡️",
    desc: "Como el 20% de los principiantes, prefieres la seguridad ante todo. Tu pajarito crecerá lento pero seguro, siempre con comida en el comedero.",
    stat: "20%",
  },
  balanced: {
    title: "¡Tu pajarito es un Explorador Equilibrado! 🌿",
    desc: "Como el 65% de los principiantes, buscas crecer a buen ritmo pero prefieres tener siempre un refugio seguro para las tormentas.",
    stat: "65%",
  },
  growth: {
    title: "¡Tu pajarito es un Águila Audaz! 🦅",
    desc: "Como el 15% de los principiantes, no le temes al riesgo. Tu pajarito volará alto buscando la Fruta Dorada, aunque a veces las tormentas lo sacudan.",
    stat: "15%",
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
        <h2 className="text-3xl text-foreground" style={{ ...nunito, fontWeight: 900 }}>{data.title}</h2>
        <p className="text-base text-muted-foreground mt-3 max-w-xs" style={{ ...nunito, fontWeight: 600 }}>{data.desc}</p>
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
        Construir su Nido
      </motion.button>
    </motion.div>
  );
};

export default ProfileResult;
