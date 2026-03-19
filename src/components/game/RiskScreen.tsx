import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Sprout, TreePine, Mountain } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RiskOption {
  label: string;
  score: number;
  icon: React.ReactNode;
}

interface Props {
  questionIndex: number;
  onAnswer: (score: number) => void;
  onBack?: () => void;
}

const CELESTE = "#5BB8F5";
const scores = [0, 1, 2];

// Per-question icons that hint at the concept without revealing risk level
const questionIcons = [
  [<Sprout key="a" className="w-5 h-5" />, <TreePine key="b" className="w-5 h-5" />, <Mountain key="c" className="w-5 h-5" />],
  [<Sprout key="a" className="w-5 h-5" />, <TreePine key="b" className="w-5 h-5" />, <Mountain key="c" className="w-5 h-5" />],
  [<Sprout key="a" className="w-5 h-5" />, <TreePine key="b" className="w-5 h-5" />, <Mountain key="c" className="w-5 h-5" />],
];

const RiskScreen = ({ questionIndex, onAnswer, onBack }: Props) => {
  const [selected, setSelected] = useState<number | null>(null);
  const { t } = useTranslation();

  const questions = t("risk.questions", { returnObjects: true }) as { title: string; options: string[] }[];
  const q = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;

  const options: RiskOption[] = q.options.map((label, i) => ({
    label,
    score: scores[i],
    icon: questionIcons[questionIndex]?.[i] ?? <Sprout className="w-5 h-5" />,
  }));

  const handleContinue = () => {
    if (selected === null) return;
    onAnswer(options[selected].score);
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
      <div className="flex items-center gap-4 px-6 pt-8 pb-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
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

      <div className="flex items-center gap-2 px-4 pt-2 pb-8">
        <img
          src="/perspectiva2.png"
          alt="Helve"
          className="object-contain flex-shrink-0"
          style={{ width: 230, height: 230, marginRight: -48, marginLeft: -50 }}
        />
        <div
          className="relative rounded-2xl px-5 py-4 flex-1"
          style={{ backgroundColor: "white", border: "2px solid hsl(var(--border))" }}
        >
          <div className="absolute top-6 w-0 h-0" style={{ left: -14, borderTop: "11px solid transparent", borderBottom: "11px solid transparent", borderRight: `13px solid hsl(var(--border))` }} />
          <div className="absolute top-6 w-0 h-0" style={{ left: -11, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: `12px solid white` }} />
          <p className="text-foreground text-base leading-snug" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            {q.title}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 flex-1">
        {options.map((opt, i) => {
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
              <span className="text-muted-foreground">{opt.icon}</span>
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
          {t("risk.continue")}
        </button>
      </div>
    </motion.div>
  );
};

export default RiskScreen;
