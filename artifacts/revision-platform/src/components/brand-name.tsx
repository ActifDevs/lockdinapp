import { cn } from "@/lib/utils";
import { APP_NAME_ACCENT, APP_NAME_ROOT } from "@/lib/app-config";

type BrandNameProps = {
  className?: string;
  accentClassName?: string;
};

export function BrandName({ className, accentClassName }: BrandNameProps) {
  return (
    <span className={className}>
      {APP_NAME_ROOT}
      <span className={cn("text-[hsl(var(--brand-amber))]", accentClassName)}>{APP_NAME_ACCENT}</span>
    </span>
  );
}
