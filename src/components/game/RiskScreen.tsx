import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface RiskOption {
  label: string;
  score: number;
  emoji: string;
}

interface Props {
  questionIndex: number;
  onAnswer: (score: number) => void;
}

const questions: { title: string; options: RiskOption[] }[] = [
  {
    title: "A market drops 20%.\nWhat do you do?",
    options: [
      { label: "Sell everything", score: 0, emoji: "🏃" },
      { label: "Wait it out", score: 1, emoji: "🧘" },
      { label: "Invest more", score: 2, emoji: "🚀" },
    ],
  },
  {
    title: "When do you need\nthis money?",
    options: [
      { label: "Within 2 years", score: 0, emoji: "⏰" },
      { label: "In 5–10 years", score: 1, emoji: "📅" },
      { label: "20+ years away", score: 2, emoji: "🌅" },
    ],
  },
  {
    title: "How do you feel\nabout risk?",
    options: [
      { label: "I avoid it", score: 0, emoji: "🛡️" },
      { label: "Some is okay", score: 1, emoji: "⚖️" },
      { label: "Bring it on", score: 2, emoji: "🔥" },
    ],
  },
];

const tints = [
  "bg-helve-green-light",
  "bg-secondary",
  "bg-helve-amber-light",
];

const RiskScreen = ({ questionIndex, onAnswer }: Props) => {
  const q = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;

  return (
    <motion.div
      className="flex flex-col min-h-screen px-6 py-8"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      key={`risk-${questionIndex}`}
    >
      <Progress value={progress} className="h-1.5 mb-12 [&>div]:bg-primary" />

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <motion.h2
          className="text-3xl font-serif text-center text-foreground whitespace-pre-line leading-tight"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {q.title}
        </motion.h2>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          {q.options.map((opt, i) => (
            <motion.button
              key={opt.label}
              className={`${tints[i]} p-5 rounded-3xl text-left text-lg font-medium text-foreground shadow-sm hover:shadow-md transition-shadow flex items-center gap-4`}
              onClick={() => onAnswer(opt.score)}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">{opt.emoji}</span>
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default RiskScreen;
