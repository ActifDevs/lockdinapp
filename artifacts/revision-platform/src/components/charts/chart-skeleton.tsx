import { cn } from "@/lib/utils";

export function ChartSkeleton({
  height = 250,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full animate-pulse rounded-xl bg-muted/60", className)}
      style={{ height }}
      aria-hidden
    />
  );
}
