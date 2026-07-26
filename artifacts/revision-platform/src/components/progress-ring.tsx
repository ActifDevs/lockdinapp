import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  label,
  color = "hsl(258 90% 66%)",
  size = 52,
  strokeWidth = 4,
  className,
}: {
  value: number;
  /** Accessible name, e.g. subject name — announced as "{label}: 72% complete" */
  label?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const rounded = Math.round(clamped);
  const ariaLabel = label ? `${label}: ${rounded}% complete` : `${rounded}% complete`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/80"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular text-foreground">
        {rounded}%
      </span>
    </div>
  );
}
