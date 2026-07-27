import { useEffect } from "react";
import { applyDocumentTheme, readStoredTheme } from "@/components/theme-provider";

/** Landing is always light; restore the user's saved theme when they leave. */
export function useLandingLightTheme() {
  useEffect(() => {
    applyDocumentTheme("light");

    return () => {
      applyDocumentTheme(readStoredTheme());
    };
  }, []);
}
