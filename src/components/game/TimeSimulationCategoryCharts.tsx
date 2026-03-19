import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export interface CategoryTrendSnapshot {
  id: string;
  label: string;
  riskLevel: number;
  changePct: number;
  color: string;
  points: Array<{ index: number; value: number }>;
}

const CATEGORY_COLORS = [
  "hsl(30, 80%, 55%)",   // warm orange
  "hsl(220, 55%, 55%)",  // slate blue
  "hsl(165, 50%, 50%)",  // teal
  "hsl(270, 50%, 55%)",  // purple
  "hsl(350, 60%, 55%)",  // rose
  "hsl(45, 80%, 50%)",   // gold
  "hsl(190, 60%, 45%)",  // cyan
  "hsl(100, 45%, 45%)",  // green
];

export function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

interface TimeSimulationCategoryChartsProps {
  items: CategoryTrendSnapshot[];
  /** Render a single item in "detail" mode (taller chart, no animation stagger) */
  detail?: boolean;
}

export default function TimeSimulationCategoryCharts({
  items,
  detail = false,
}: TimeSimulationCategoryChartsProps) {
  if (items.length === 0) return null;

  return (
    <div className={detail ? "space-y-0" : "space-y-1"}>
      {items.map((item, index) => {
        const positive = item.changePct >= 0;
        const lineColor = item.color;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: detail ? 0 : index * 0.06 }}
            className={detail ? "py-1" : "py-0.5"}
          >
            {/* Label row */}
            <div className="flex items-baseline justify-between mb-0.5 px-1">
              <p className="text-sm font-bold text-foreground">{item.label}</p>
              <p
                className="text-sm font-bold tabular-nums"
                style={{ color: positive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
              >
                {positive ? "+" : ""}{item.changePct.toFixed(1)}%
              </p>
            </div>

            {/* Sparkline */}
            <div className={detail ? "h-16" : "h-12"}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={item.points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
