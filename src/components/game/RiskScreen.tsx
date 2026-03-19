import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

interface RiskOption {
  label: string;
  score: number;
  emoji: string;
}

interface Props {
  questionIndex: number;
  onAnswer: (score: number) => void;
  onBack?: () => void;
}

const questions: { title: string; options: RiskOption[] }[] = [
  {
    title: "¿Cómo buscará su comida tu pajarito hoy?",
    options: [
      { label: "Comer semillas de su comedero. Siempre habrá comida garantizada, pero crecerá muy lento.", score: 0, emoji: "🟢" },
      { label: "Buscar bayas en las ramas medias. A veces volverá con las alas vacías, pero cuando encuentre, crecerá más.", score: 1, emoji: "🟡" },
      { label: "Volar hasta la cima por la Fruta Dorada. Es muy arriesgado, pero si la consigue, crecerá muchísimo de golpe.", score: 2, emoji: "🔴" },
    ],
  },
  {
    title: "¡Oh no! Una fuerte tormenta sacude el árbol y el nido se tambalea. ¿Qué haces?",
    options: [
      { label: "Lo llamo rápido para que baje al suelo, prefiero que esté a salvo aunque el nido se rompa.", score: 0, emoji: "🟢" },
      { label: "Le digo que se refugie bien en el nido y espere con calma a que vuelva a salir el sol.", score: 1, emoji: "🟡" },
      { label: "¡Aprovecho! El viento botó ramas nuevas, le digo que salga a buscar más para hacer un nido más grande.", score: 2, emoji: "🔴" },
    ],
  },
  {
    title: "¿Para qué aventura estás entrenando a tu pajarito?",
    options: [
      { label: "Para vuelos cortos cerca de casa. Lo necesito cerca por si hay alguna emergencia pronto.", score: 0, emoji: "🟢" },
      { label: "Para explorar el bosque. Tardará un par de temporadas en volver, pero descubrirá cosas nuevas.", score: 1, emoji: "🟡" },
      { label: "Para la Gran Migración. No lo veré por muchos años, pero volverá convertido en un ave majestuosa.", score: 2, emoji: "🔴" },
    ],
  },
];

const RiskScreen = ({ questionIndex, onAnswer, onBack }: Props) => {
  const [selected, setSelected] = useState<number | null>(null);
  const q = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;

  const handleContinue = () => {
    if (selected === null) return;
    onAnswer(q.options[selected].score);
    setSelected(null);
  };

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-background"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      key={`risk-${questionIndex}`}
    >
      {/* Top bar: back + progress */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-6">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <div className="flex-1 h-5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: CELESTE }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Mascot + speech bubble */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-8">
        <img
          src="/perspectiva2.png"
          alt="Helve"
          className="object-contain flex-shrink-0"
          style={{ width: 230, height: 230, marginRight: -48, marginLeft: -50 }}
        />

        {/* Bubble */}
        <div
          className="relative rounded-2xl px-5 py-4 flex-1"
          style={{ backgroundColor: "white", border: "2px solid hsl(var(--border))" }}
        >
          {/* Tail border (gray, slightly bigger) */}
          <div
            className="absolute top-6 w-0 h-0"
            style={{
              left: -14,
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              borderRight: `13px solid hsl(var(--border))`,
            }}
          />
          {/* Tail fill (white, covers the gray) */}
          <div
            className="absolute top-6 w-0 h-0"
            style={{
              left: -11,
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderRight: `12px solid white`,
            }}
          />
          <p className="text-foreground text-base leading-snug" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            {q.title}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 px-5 flex-1">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <motion.button
              key={opt.label}
              onClick={() => setSelected(i)}
              className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl border-2 text-left transition-colors"
              style={{
                borderColor: isSelected ? CELESTE : "hsl(var(--border))",
                backgroundColor: isSelected ? "#EBF6FF" : "hsl(var(--card))",
              }}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span
                className="text-foreground text-base"
                style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, color: isSelected ? CELESTE : undefined }}
              >
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* CONTINUE button */}
      <div className="px-5 py-8">
        <button
          onClick={handleContinue}
          disabled={selected === null}
          className="w-full py-4 rounded-2xl tracking-widest text-sm text-white transition-opacity"
          style={{
            fontFamily: "'Nunito', sans-serif",
            backgroundColor: CELESTE,
            fontWeight: 900,
            opacity: selected === null ? 0.4 : 1,
          }}
        >
          CONTINUE
        </button>
      </div>
    </motion.div>
  );
};

export default RiskScreen;
