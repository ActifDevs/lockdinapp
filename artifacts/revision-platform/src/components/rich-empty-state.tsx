import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { EmptyIllustration, type EmptyScene } from "@/components/illustrations";

type PastelVariant = "yellow" | "mint" | "blue" | "purple" | "pink";

const iconBg: Record<PastelVariant, string> = {
  yellow: "pastel-yellow",
  mint: "pastel-mint",
  blue: "pastel-blue",
  purple: "pastel-purple",
  pink: "pastel-pink",
};

export function RichEmptyState({
  icon: Icon,
  scene,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  variant = "purple",
  className,
}: {
  icon?: LucideIcon;
  /** Soft SVG scene — preferred over icon when provided */
  scene?: EmptyScene;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  variant?: PastelVariant;
  className?: string;
}) {
  return (
    <Empty className={cn("border-0 bg-transparent py-10 md:py-14", className)}>
      <EmptyHeader>
        {scene ? (
          <EmptyMedia className="mx-auto mb-1 w-full max-w-[13rem] bg-transparent p-0 shadow-none">
            <EmptyIllustration scene={scene} />
          </EmptyMedia>
        ) : Icon ? (
          <EmptyMedia
            className={cn(
              "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm",
              iconBg[variant],
            )}
          >
            <Icon className="h-8 w-8" aria-hidden strokeWidth={1.5} />
          </EmptyMedia>
        ) : null}
        <EmptyTitle className="text-xl font-semibold">{title}</EmptyTitle>
        <EmptyDescription className="max-w-sm text-base">{description}</EmptyDescription>
      </EmptyHeader>
      {actionLabel && (onAction || actionHref) && (
        <EmptyContent>
          {actionHref ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}
