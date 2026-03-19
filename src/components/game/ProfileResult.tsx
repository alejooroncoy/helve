import { motion } from "framer-motion";
import type { RiskProfile } from "@/game/types";

interface Props {
  profile: RiskProfile;
  onContinue: () => void;
}

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

const profileData: Record<RiskProfile, { title: string; mascot: string; card: string }> = {
  conservative: {
    title: "Guardián Prudente",
    mascot: "/mascot-conservative.png",
    card: "Prefieres la seguridad ante todo. Tu nido será fuerte y estable, con comida garantizada todos los días. ¡Vamos a construir tu Nido juntos!",
  },
  balanced: {
    title: "Explorador Equilibrado",
    mascot: "/mascot-balanced.png",
    card: "Como la mayoría de los principiantes, buscas crecer a buen ritmo pero prefieres tener siempre un refugio seguro. ¡Vamos a construir tu Nido juntos!",
  },
  growth: {
    title: "Águila Audaz",
    mascot: "/mascot-growth.png",
    card: "No le temes a las tormentas y siempre buscas la Fruta Dorada. Volarás alto y lejos. ¡Vamos a construir tu Nido juntos!",
  },
};

const ProfileResult = ({ profile, onContinue }: Props) => {
  const data = profileData[profile];

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Mascot image */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        <motion.img
          src={data.mascot}
          alt={data.title}
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
            {data.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed" style={{ ...nunito, fontWeight: 600 }}>
            {data.card}
          </p>
        </motion.div>
      </div>

      {/* CTA */}
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
          CONSTRUIR MI NIDO
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileResult;
