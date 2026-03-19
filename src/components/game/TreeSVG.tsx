import { motion } from "framer-motion";

interface TreeSVGProps {
  stage?: "seed" | "small" | "medium" | "large";
  shaking?: boolean;
  storm?: boolean;
}

const TreeSVG = ({ stage = "small", shaking = false, storm = false }: TreeSVGProps) => {
  const scales: Record<string, number> = {
    seed: 0.4,
    small: 0.6,
    medium: 0.8,
    large: 1,
  };

  const leafOpacity = storm ? 0.3 : 1;
  const trunkColor = "hsl(25, 30%, 35%)";
  const leafColor = storm ? "hsl(40, 30%, 50%)" : "hsl(145, 45%, 40%)";
  const leafColorLight = storm ? "hsl(40, 25%, 60%)" : "hsl(145, 50%, 55%)";

  return (
    <motion.div
      className={shaking ? "animate-shake-tree" : "animate-breathe"}
      style={{ transformOrigin: "bottom center" }}
    >
      <motion.svg
        viewBox="0 0 200 260"
        className="w-40 h-52 mx-auto"
        initial={{ scale: scales[stage] }}
        animate={{ scale: scales[stage] }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Trunk */}
        <rect x="90" y="160" width="20" height="80" rx="4" fill={trunkColor} />
        {/* Roots */}
        <path d="M85 240 Q70 250 60 245" stroke={trunkColor} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M115 240 Q130 250 140 245" stroke={trunkColor} strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Foliage layers */}
        <motion.ellipse
          cx="100" cy="130" rx="55" ry="45"
          fill={leafColor}
          animate={{ opacity: leafOpacity }}
          transition={{ duration: 0.8 }}
        />
        <motion.ellipse
          cx="80" cy="115" rx="40" ry="35"
          fill={leafColorLight}
          animate={{ opacity: leafOpacity }}
          transition={{ duration: 0.8 }}
        />
        <motion.ellipse
          cx="120" cy="110" rx="38" ry="32"
          fill={leafColor}
          animate={{ opacity: leafOpacity }}
          transition={{ duration: 0.8 }}
        />
        <motion.ellipse
          cx="100" cy="95" rx="30" ry="28"
          fill={leafColorLight}
          animate={{ opacity: leafOpacity }}
          transition={{ duration: 0.8 }}
        />

        {stage === "seed" && (
          <>
            <circle cx="100" cy="220" r="8" fill="hsl(25, 50%, 45%)" />
            <path d="M100 212 Q100 195 108 190" stroke={leafColor} strokeWidth="2" fill="none" />
          </>
        )}
      </motion.svg>
    </motion.div>
  );
};

export default TreeSVG;
