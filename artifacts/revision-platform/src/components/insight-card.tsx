import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type CardTint = "cream" | "teal" | "amber" | "coral" | "deep";

const TINT_CLASS: Record<CardTint, string> = {
  cream: "card-tint-cream",
  teal: "card-tint-teal",
  amber: "card-tint-amber",
  coral: "card-tint-coral",
  deep: "card-tint-deep",
};

type InsightCardProps = {
  title: ReactNode;
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
  /** Soft brand fill from the shared palette */
  tint?: CardTint;
};

export function InsightCard({ title, action, children, className, tint = "cream" }: InsightCardProps) {
  return (
    <div className={cn("dash-insight-card", TINT_CLASS[tint], className)}>
      <div className="dash-insight-card-header">
        <h3 className="min-w-0 flex-1 text-[0.9375rem] font-bold tracking-[-0.01em]">{title}</h3>
        {action && (
          <Link href={action.href} className="dash-insight-action">
            {action.label}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2.25} />
          </Link>
        )}
      </div>
      <div className="dash-insight-card-body">{children}</div>
    </div>
  );
}
