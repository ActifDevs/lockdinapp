import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"

export const THEME_STORAGE_KEY = "vite-ui-theme"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function resolveDocumentTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return theme
}

export function applyDocumentTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolveDocumentTheme(theme))
}

export function readStoredTheme(
  storageKey = THEME_STORAGE_KEY,
  defaultTheme: Theme = "dark",
): Theme {
  return (localStorage.getItem(storageKey) as Theme | null) || defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => readStoredTheme(storageKey, defaultTheme),
  )

  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
