import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getQueryErrorMessage,
  isCancelledQueryError,
} from "@/lib/query-error-message";
import { cn } from "@/lib/utils";

type ReadStateNoticeProps = {
  title: string;
  error?: unknown;
  description?: string;
  onRetry?: () => void;
  stale?: boolean;
  compact?: boolean;
  className?: string;
};

export function ReadStateNotice({
  title,
  error,
  description,
  onRetry,
  stale = false,
  compact = false,
  className,
}: ReadStateNoticeProps) {
  if (isCancelledQueryError(error)) return null;

  const message =
    description ??
    (stale
      ? "The last saved view is still visible, but refresh failed and it may be outdated."
      : getQueryErrorMessage(error));

  return (
    <div
      role={stale ? "status" : "alert"}
      aria-live={stale ? "polite" : "assertive"}
      className={cn(
        "rounded-xl border px-4 py-3",
        stale
          ? "border-[hsl(var(--semantic-attention)/0.35)] bg-[hsl(var(--semantic-attention)/0.08)]"
          : "border-destructive/30 bg-destructive/5",
        compact && "rounded-lg px-3 py-2.5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            stale
              ? "text-[hsl(var(--semantic-attention))]"
              : "text-destructive",
          )}
          aria-hidden
          strokeWidth={2}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {message}
          </p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
