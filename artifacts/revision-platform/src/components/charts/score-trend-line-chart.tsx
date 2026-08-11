import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { scoreTrendSummary } from "@/lib/chart-summaries";
import { formatPercentage } from "@/lib/format-percentage";

type ScoreTrendLineChartProps<T extends { percentage: number }> = {
  data: T[];
  xKey: string;
  stroke: string;
  height?: number;
  tooltipLabelFormatter?: (label: string, items: Array<{ payload?: T }>) => string;
  summaryLabel?: (point: T, index: number) => string;
};

export default function ScoreTrendLineChart<T extends { percentage: number }>({
  data,
  xKey,
  stroke,
  height = 300,
  tooltipLabelFormatter,
  summaryLabel,
}: ScoreTrendLineChartProps<T>) {
  const summary = scoreTrendSummary(
    data,
    summaryLabel ?? ((point, index) => String((point as Record<string, unknown>)[xKey] ?? `Entry ${index + 1}`)),
  );

  return (
    <div className="w-full" style={{ height }}>
      <p className="sr-only">{summary}</p>
      <ResponsiveContainer width="100%" height="100%" aria-hidden>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
            dy={10}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
            dx={-10}
            tickFormatter={(v) => `${v}%`}
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}
            itemStyle={{ color: "hsl(var(--foreground))" }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value: number) => [formatPercentage(value), "Score"]}
            labelFormatter={tooltipLabelFormatter}
          />
          <Line
            type="monotone"
            dataKey="percentage"
            stroke={stroke}
            strokeWidth={3}
            dot={{ r: 4, fill: stroke, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: stroke, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
