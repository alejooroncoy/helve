import { motion, AnimatePresence } from "framer-motion";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Area,
  AreaChart,
  Label,
} from "recharts";

export interface CategoryTrendSnapshot {
  id: string;
  label: string;
  riskLevel: number;
  changePct: number;
  color: string;
  points: Array<{ index: number; value: number }>;
}

export interface EventMarker {
  /** index in the points array where the event fires */
  pointIndex: number;
  /** short label shown on the chart */
  label?: string;
  direction?: "drop" | "surge" | "shake";
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
  detail?: boolean;
  eventMarker?: EventMarker;
}

export default function TimeSimulationCategoryCharts({
  items,
  detail = false,
  eventMarker,
}: TimeSimulationCategoryChartsProps) {
  if (items.length === 0) return null;

  return (
    <div className={detail ? "space-y-0" : "space-y-1"}>
      {items.map((item, index) => {
        const positive = item.changePct >= 0;
        const lineColor = item.color;
        const hasMarker = detail && eventMarker && eventMarker.pointIndex < item.points.length;

        // For detail mode with event marker: split into before/after coloring
        const markerIdx = hasMarker ? eventMarker!.pointIndex : -1;
        const markerPoint = hasMarker ? item.points[markerIdx] : null;

        // Build augmented data with "before" and "after" value channels for area fill
        const augmentedData = hasMarker
          ? item.points.map((pt) => ({
              ...pt,
              before: pt.index <= markerIdx ? pt.value : undefined,
              after: pt.index >= markerIdx ? pt.value : undefined,
            }))
          : item.points;

        const beforeColor = "hsl(var(--primary))";
        const afterColor = eventMarker?.direction === "surge"
          ? "hsl(var(--primary))"
          : "hsl(var(--destructive))";

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
              <AnimatePresence mode="wait">
                <motion.p
                  key={item.changePct.toFixed(1)}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-bold tabular-nums"
                  style={{ color: positive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
                >
                  {positive ? "+" : ""}{item.changePct.toFixed(1)}%
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Sparkline */}
            <div className={detail ? "h-24" : "h-12"}>
              {hasMarker ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={augmentedData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    {/* Before zone fill */}
                    <defs>
                      <linearGradient id={`before-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={beforeColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={beforeColor} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id={`after-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={afterColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={afterColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <Area
                      type="monotone"
                      dataKey="before"
                      stroke={beforeColor}
                      strokeWidth={2.5}
                      fill={`url(#before-${item.id})`}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive
                      animationDuration={600}
                    />
                    <Area
                      type="monotone"
                      dataKey="after"
                      stroke={afterColor}
                      strokeWidth={2.5}
                      fill={`url(#after-${item.id})`}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive
                      animationDuration={600}
                    />

                    {/* Event vertical line */}
                    <ReferenceLine
                      x={markerIdx}
                      stroke={afterColor}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      ifOverflow="extendDomain"
                    />

                    {/* Event dot */}
                    {markerPoint && (
                      <ReferenceDot
                        x={markerIdx}
                        y={markerPoint.value}
                        r={5}
                        fill={afterColor}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        ifOverflow="extendDomain"
                      >
                        {eventMarker!.label && (
                          <Label
                            value={eventMarker!.label}
                            position="top"
                            offset={10}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              fill: afterColor,
                            }}
                          />
                        )}
                      </ReferenceDot>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={item.points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={lineColor}
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive
                      animationDuration={800}
                      animationEasing="ease-in-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
