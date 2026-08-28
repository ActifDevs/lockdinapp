import { useCallback, useRef } from "react";

type NavigationGuardState<T extends string> = {
  committedValue: T;
  pendingValue: T | null;
};

export function useIdempotentControlledNavigation<T extends string>(
  committedValue: T,
) {
  const state = useRef<NavigationGuardState<T>>({
    committedValue,
    pendingValue: null,
  });

  if (!Object.is(state.current.committedValue, committedValue)) {
    state.current.committedValue = committedValue;
    state.current.pendingValue = null;
  }

  return useCallback((requestedValue: T): boolean => {
    if (
      Object.is(requestedValue, state.current.committedValue) ||
      Object.is(requestedValue, state.current.pendingValue)
    ) {
      return false;
    }

    state.current.pendingValue = requestedValue;
    return true;
  }, []);
}
