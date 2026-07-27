import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  LandingAmbientBackground,
  type LandingAmbientVariant,
} from "@/components/landing-ambient-background";
import { cn } from "@/lib/utils";

type LandingSectionProps = {
  id?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  background?: ReactNode;
  /** Subtle animated backdrop — not used on hero or CTA/footer */
  ambient?: LandingAmbientVariant;
  /** First screen — animate on mount, not on scroll */
  hero?: boolean;
  /** Slides up and stacks over pinned sections beneath */
  stack?: boolean;
  /** Vertically center section content */
  center?: boolean;
  /** Pin inner content to bottom (hero copy over visual) */
  alignEnd?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function LandingSection({
  id,
  className,
  innerClassName,
  children,
  background,
  ambient,
  hero = false,
  stack = !hero,
  center = true,
  alignEnd = false,
}: LandingSectionProps) {
  const reduceMotion = useReducedMotion();

  const motionProps = hero
    ? {
        initial: reduceMotion ? false : { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: reduceMotion ? { duration: 0 } : { duration: 0.65, ease: EASE },
      }
    : {
        initial: reduceMotion ? false : { opacity: 0, y: 40, scale: 0.985 },
        whileInView: { opacity: 1, y: 0, scale: 1 },
        viewport: { once: false, amount: 0.4, margin: "-8% 0px -8% 0px" },
        transition: reduceMotion ? { duration: 0 } : { duration: 0.7, ease: EASE },
      };

  return (
    <section
      id={id}
      className={cn(
        "landing-section",
        center && "landing-section-center",
        alignEnd && "landing-section-end",
        hero && "landing-section-hero",
        stack && "landing-section-stack",
        className,
      )}
    >
      {background}
      {ambient && <LandingAmbientBackground variant={ambient} />}
      <motion.div
        className={cn(
          "landing-section-inner relative z-10",
          center && !alignEnd && "landing-section-inner-center",
          alignEnd && "landing-section-inner-end",
          innerClassName,
        )}
        {...motionProps}
      >
        {children}
      </motion.div>
    </section>
  );
}
