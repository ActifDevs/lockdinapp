import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string
    /** Semantic fill: progress (cyan), xp (gold), complete (green) */
    tone?: "progress" | "xp" | "complete"
    complete?: boolean
  }
>(({ className, value, indicatorClassName, tone = "progress", complete, ...props }, ref) => {
  const resolvedTone = complete || (value ?? 0) >= 100 ? "complete" : tone
  const fillClass =
    resolvedTone === "xp"
      ? "dash-meter-fill-xp"
      : resolvedTone === "complete"
        ? "dash-meter-fill-complete"
        : "dash-meter-fill"

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("dash-meter", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          fillClass,
          "transition-[transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          indicatorClassName
        )}
        data-complete={resolvedTone === "complete" ? "true" : undefined}
        style={{ transform: `translateX(-${100 - (value || 0)}%)`, width: "100%" }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
