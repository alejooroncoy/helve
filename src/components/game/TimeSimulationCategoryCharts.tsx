import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

export interface CategoryTrendSnapshot {
  id: string;
  label: string;
  riskLevel: number;
  changePct: number;
  points: Array<{ index: number; value: number }>;
}

interface TimeSimulationCategoryChartsProps {
  title: string;
  subtitle: string;
  riskLabel: (level: number) => string;
  items: CategoryTrendSnapshot[];
}

export default function TimeSimulationCategoryCharts({
  title,
  subtitle,
  riskLabel,
  items,
}: TimeSimulationCategoryChartsProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {items.map((item, index) => {
          const positive = item.changePct >= 0;
          const TrendIcon = positive ? TrendingUp : TrendingDown;
          const lineColor = positive ? "hsl(var(--primary))" : "hsl(var(--destructive))";

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="min-w-[220px] snap-start rounded-3xl border bg-card/90 p-4 shadow-sm"
              style={{
                borderColor: "hsl(var(--border))",
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{riskLabel(item.riskLevel)}</p>
                </div>
                <div
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: positive ? "hsl(var(--primary) / 0.12)" : "hsl(var(--destructive) / 0.12)",
                    color: lineColor,
                  }}
                >
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span>{positive ? "+" : ""}{item.changePct.toFixed(1)}%</span>
                </div>
              </div>

              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={item.points} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
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
    </div>
  );
}
