import { formatPercentage } from "@/lib/format-percentage";

export type WeeklyActivityPoint = {
  date: string;
  tasksCompleted: number;
};

export function weeklyActivitySummary(data: WeeklyActivityPoint[]): string {
  if (data.length === 0) {
    return "No activity recorded in the last seven days.";
  }

  const total = data.reduce((sum, point) => sum + point.tasksCompleted, 0);
  const daily = data
    .map((point) => `${point.date}: ${point.tasksCompleted} task${point.tasksCompleted === 1 ? "" : "s"}`)
    .join("; ");

  return `Last seven days: ${total} task${total === 1 ? "" : "s"} completed. Daily breakdown: ${daily}.`;
}

export function scoreTrendSummary<T extends { percentage: number }>(
  data: T[],
  labelForPoint: (point: T, index: number) => string,
): string {
  if (data.length === 0) {
    return "No score history available.";
  }

  const latest = data[data.length - 1]!;
  const first = data[0]!;
  const change = latest.percentage - first.percentage;
  const trend =
    change > 0 ? "up" : change < 0 ? "down" : "unchanged";
  const points = data
    .map((point, index) => `${labelForPoint(point, index)}: ${formatPercentage(point.percentage)}`)
    .join("; ");

  return `Score trend over ${data.length} entries, latest ${formatPercentage(latest.percentage)}, ${trend} from ${formatPercentage(first.percentage)}. ${points}.`;
}
