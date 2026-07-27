import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  weeklyActivitySummary,
  type WeeklyActivityPoint,
} from "@/lib/chart-summaries";

export type { WeeklyActivityPoint };

type WeeklyActivityBarChartProps = {
  data: WeeklyActivityPoint[];
  height: number;
  compact?: boolean;
};

export default function WeeklyActivityBarChart({
  data,
  height,
  compact = false,
}: WeeklyActivityBarChartProps) {
  const margin = compact
    ? { top: 4, right: 4, left: 0, bottom: 0 }
    : { top: 10, right: 10, left: 0, bottom: 0 };
  const gradientId = "weekProgressFill";
  const summary = weeklyActivitySummary(data);

  return (
    <div className="w-full" style={{ height }}>
      <p className="sr-only">{summary}</p>
      <ResponsiveContainer width="100%" height="100%" aria-hidden>
        <BarChart data={data} margin={margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--semantic-progress))" stopOpacity={0.95} />
              <stop offset="100%" stopColor="hsl(var(--semantic-progress))" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-10" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: compact ? 10 : 12,
              fill: "currentColor",
              opacity: compact ? 0.45 : 0.5,
            }}
            dy={compact ? 0 : 10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={compact ? 28 : 32}
            tick={{
              fontSize: compact ? 10 : 12,
              fill: "currentColor",
              opacity: compact ? 0.45 : 0.5,
            }}
          />
          <RechartsTooltip
            cursor={{ fill: "currentColor", opacity: compact ? 0.04 : 0.05 }}
            contentStyle={
              compact
                ? { borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }
                : { borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }
            }
            formatter={(value) => [value, "Tasks"]}
          />
          <Bar
            dataKey="tasksCompleted"
            fill={`url(#${gradientId})`}
            radius={compact ? [6, 6, 0, 0] : [8, 8, 0, 0]}
            maxBarSize={compact ? 28 : 48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
