import { Link } from "wouter";
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
      <div className="dash-insight-card-header flex items-center justify-between gap-3">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        {action && (
          <Link href={action.href} className="shrink-0 text-xs font-medium text-primary hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      <div className="dash-insight-card-body">{children}</div>
    </div>
  );
}
