import { useReducedMotion } from "framer-motion";

type EntranceOptions = {
  delayStep?: number;
  maxDelay?: number;
  duration?: number;
  y?: number;
};

const DEFAULT_EASE = [0.23, 1, 0.32, 1] as const;

export function entranceProps(
  reduceMotion: boolean | null,
  index = 0,
  options: EntranceOptions = {},
) {
  const { delayStep = 0.04, maxDelay = 0.16, duration = 0.28, y = 8 } = options;

  return {
    initial: reduceMotion ? false : { opacity: 0, transform: `translateY(${y}px)` },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: {
      delay: reduceMotion ? 0 : Math.min(index * delayStep, maxDelay),
      duration: reduceMotion ? 0 : duration,
      ease: DEFAULT_EASE,
    },
  };
}

export function useEntrance(index = 0, options: EntranceOptions = {}) {
  const reduceMotion = useReducedMotion();

  return {
    reduceMotion,
    ...entranceProps(reduceMotion, index, options),
  };
}
