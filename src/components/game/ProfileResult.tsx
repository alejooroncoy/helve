import { motion } from "framer-motion";
import type { RiskProfile } from "@/game/types";

interface Props {
  profile: RiskProfile;
  onContinue: () => void;
}

const CELESTE = "#5BB8F5";
const nunito = { fontFamily: "'Nunito', sans-serif" };

const profileData: Record<RiskProfile, { title: string; emoji: string; bubble: string; card: string }> = {
  conservative: {
    title: "Guardián Prudente",
    emoji: "🛡️",
    bubble: "¡Ya sé qué tipo de ave eres! Eres un Guardián Prudente 🛡️",
    card: "Prefieres la seguridad ante todo. Tu nido será fuerte y estable, con comida garantizada todos los días. ¡Vamos a construir tu Nido juntos!",
  },
  balanced: {
    title: "Explorador Equilibrado",
    emoji: "🌿",
    bubble: "¡Ya sé qué tipo de ave eres! Eres un Explorador Equilibrado 🌿",
    card: "Como la mayoría de los principiantes, buscas crecer a buen ritmo pero prefieres tener siempre un refugio seguro. ¡Vamos a construir tu Nido juntos!",
  },
  growth: {
    title: "Águila Audaz",
    emoji: "🦅",
    bubble: "¡Ya sé qué tipo de ave eres! Eres un Águila Audaz 🦅",
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
      {/* Mascot + speech bubble */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-6">
        <img
          src="/perspectiva2.png"
          alt="Helve"
          className="object-contain flex-shrink-0"
          style={{ width: 200, height: 200, marginRight: -40, marginLeft: -40 }}
        />

        <div
          className="relative rounded-2xl px-5 py-4 flex-1"
          style={{ backgroundColor: "white", border: `2px solid hsl(var(--border))` }}
        >
          {/* Tail border */}
          <div
            className="absolute top-6 w-0 h-0"
            style={{
              left: -14,
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              borderRight: `13px solid hsl(var(--border))`,
            }}
          />
          {/* Tail fill */}
          <div
            className="absolute top-6 w-0 h-0"
            style={{
              left: -11,
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderRight: `12px solid white`,
            }}
          />
          <p className="text-foreground text-base leading-snug" style={{ ...nunito, fontWeight: 600 }}>
            {data.bubble}
          </p>
        </div>
      </div>

      {/* Result card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
        >
          <span className="text-7xl">{data.emoji}</span>
        </motion.div>

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
