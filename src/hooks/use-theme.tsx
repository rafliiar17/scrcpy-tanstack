import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

// ── Palette Definitions ─────────────────────────────────────────

export interface ThemePalette {
  id: string;
  name: string;
  preview: string; // gradient for the preview swatch
  lightVars: Record<string, string>;
  darkVars: Record<string, string>;
}

const PALETTES: ThemePalette[] = [
  {
    id: "default",
    name: "Default",
    preview: "linear-gradient(135deg, #18181b, #27272a)",
    lightVars: {
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.145 0 0)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.145 0 0)",
      "--primary": "oklch(0.205 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.97 0 0)",
      "--secondary-foreground": "oklch(0.205 0 0)",
      "--muted": "oklch(0.97 0 0)",
      "--muted-foreground": "oklch(0.556 0 0)",
      "--accent": "oklch(0.97 0 0)",
      "--accent-foreground": "oklch(0.205 0 0)",
      "--border": "oklch(0.922 0 0)",
      "--input": "oklch(0.922 0 0)",
      "--ring": "oklch(0.708 0 0)",
      "--sidebar": "oklch(0.985 0 0)",
      "--sidebar-primary": "oklch(0.205 0 0)",
    },
    darkVars: {
      "--background": "oklch(0.145 0 0)",
      "--foreground": "oklch(0.985 0 0)",
      "--card": "oklch(0.205 0 0)",
      "--card-foreground": "oklch(0.985 0 0)",
      "--primary": "oklch(0.922 0 0)",
      "--primary-foreground": "oklch(0.205 0 0)",
      "--secondary": "oklch(0.269 0 0)",
      "--secondary-foreground": "oklch(0.985 0 0)",
      "--muted": "oklch(0.269 0 0)",
      "--muted-foreground": "oklch(0.708 0 0)",
      "--accent": "oklch(0.269 0 0)",
      "--accent-foreground": "oklch(0.985 0 0)",
      "--border": "oklch(1 0 0 / 10%)",
      "--input": "oklch(1 0 0 / 15%)",
      "--ring": "oklch(0.556 0 0)",
      "--sidebar": "oklch(0.205 0 0)",
      "--sidebar-primary": "oklch(0.488 0.243 264.376)",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    preview: "linear-gradient(135deg, #0c1426, #1e3a5f)",
    lightVars: {
      "--background": "oklch(0.98 0.02 250)",
      "--foreground": "oklch(0.20 0.05 250)",
      "--card": "oklch(1 0.01 250)",
      "--card-foreground": "oklch(0.20 0.05 250)",
      "--primary": "oklch(0.50 0.15 250)",
      "--primary-foreground": "oklch(0.98 0.01 250)",
      "--secondary": "oklch(0.94 0.04 250)",
      "--secondary-foreground": "oklch(0.30 0.10 250)",
      "--muted": "oklch(0.94 0.04 250)",
      "--muted-foreground": "oklch(0.50 0.05 250)",
      "--accent": "oklch(0.94 0.04 250)",
      "--accent-foreground": "oklch(0.30 0.10 250)",
      "--border": "oklch(0.90 0.05 250)",
      "--input": "oklch(0.90 0.05 250)",
      "--ring": "oklch(0.50 0.15 250)",
      "--sidebar": "oklch(0.96 0.03 250)",
      "--sidebar-primary": "oklch(0.50 0.15 250)",
    },
    darkVars: {
      "--background": "oklch(0.15 0.02 250)",
      "--foreground": "oklch(0.95 0.01 220)",
      "--card": "oklch(0.20 0.03 250)",
      "--card-foreground": "oklch(0.95 0.01 220)",
      "--primary": "oklch(0.65 0.15 230)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.25 0.04 240)",
      "--secondary-foreground": "oklch(0.95 0.01 220)",
      "--muted": "oklch(0.25 0.03 250)",
      "--muted-foreground": "oklch(0.65 0.04 230)",
      "--accent": "oklch(0.30 0.06 230)",
      "--accent-foreground": "oklch(0.95 0.01 220)",
      "--border": "oklch(0.35 0.05 240 / 30%)",
      "--input": "oklch(0.30 0.04 240 / 40%)",
      "--ring": "oklch(0.55 0.12 230)",
      "--sidebar": "oklch(0.18 0.03 250)",
      "--sidebar-primary": "oklch(0.60 0.18 230)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    preview: "linear-gradient(135deg, #0d1a0d, #1a3a1a)",
    lightVars: {
      "--background": "oklch(0.98 0.02 145)",
      "--foreground": "oklch(0.20 0.05 145)",
      "--card": "oklch(1 0.01 145)",
      "--card-foreground": "oklch(0.20 0.05 145)",
      "--primary": "oklch(0.45 0.12 145)",
      "--primary-foreground": "oklch(0.98 0.01 145)",
      "--secondary": "oklch(0.94 0.04 145)",
      "--secondary-foreground": "oklch(0.30 0.10 145)",
      "--muted": "oklch(0.94 0.04 145)",
      "--muted-foreground": "oklch(0.50 0.05 145)",
      "--accent": "oklch(0.94 0.04 145)",
      "--accent-foreground": "oklch(0.30 0.10 145)",
      "--border": "oklch(0.90 0.05 145)",
      "--input": "oklch(0.90 0.05 145)",
      "--ring": "oklch(0.45 0.12 145)",
      "--sidebar": "oklch(0.96 0.03 145)",
      "--sidebar-primary": "oklch(0.45 0.12 145)",
    },
    darkVars: {
      "--background": "oklch(0.15 0.02 145)",
      "--foreground": "oklch(0.95 0.01 140)",
      "--card": "oklch(0.20 0.03 145)",
      "--card-foreground": "oklch(0.95 0.01 140)",
      "--primary": "oklch(0.65 0.15 145)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.25 0.04 140)",
      "--secondary-foreground": "oklch(0.95 0.01 140)",
      "--muted": "oklch(0.25 0.03 145)",
      "--muted-foreground": "oklch(0.65 0.04 140)",
      "--accent": "oklch(0.30 0.06 145)",
      "--accent-foreground": "oklch(0.95 0.01 140)",
      "--border": "oklch(0.35 0.05 140 / 30%)",
      "--input": "oklch(0.30 0.04 140 / 40%)",
      "--ring": "oklch(0.55 0.12 145)",
      "--sidebar": "oklch(0.18 0.03 145)",
      "--sidebar-primary": "oklch(0.60 0.18 145)",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    preview: "linear-gradient(135deg, #1a0d0d, #3a1a0d)",
    lightVars: {
      "--background": "oklch(0.98 0.02 35)",
      "--foreground": "oklch(0.25 0.05 35)",
      "--card": "oklch(1 0.01 35)",
      "--card-foreground": "oklch(0.25 0.05 35)",
      "--primary": "oklch(0.55 0.15 35)",
      "--primary-foreground": "oklch(0.98 0.01 35)",
      "--secondary": "oklch(0.94 0.04 35)",
      "--secondary-foreground": "oklch(0.30 0.10 35)",
      "--muted": "oklch(0.94 0.04 35)",
      "--muted-foreground": "oklch(0.50 0.05 35)",
      "--accent": "oklch(0.94 0.04 35)",
      "--accent-foreground": "oklch(0.30 0.10 35)",
      "--border": "oklch(0.90 0.05 35)",
      "--input": "oklch(0.90 0.05 35)",
      "--ring": "oklch(0.55 0.15 35)",
      "--sidebar": "oklch(0.96 0.03 35)",
      "--sidebar-primary": "oklch(0.55 0.15 35)",
    },
    darkVars: {
      "--background": "oklch(0.15 0.02 25)",
      "--foreground": "oklch(0.95 0.01 30)",
      "--card": "oklch(0.20 0.03 25)",
      "--card-foreground": "oklch(0.95 0.01 30)",
      "--primary": "oklch(0.70 0.18 30)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.25 0.04 25)",
      "--secondary-foreground": "oklch(0.95 0.01 30)",
      "--muted": "oklch(0.25 0.03 25)",
      "--muted-foreground": "oklch(0.65 0.04 30)",
      "--accent": "oklch(0.30 0.06 25)",
      "--accent-foreground": "oklch(0.95 0.01 30)",
      "--border": "oklch(0.35 0.05 25 / 30%)",
      "--input": "oklch(0.30 0.04 25 / 40%)",
      "--ring": "oklch(0.55 0.12 30)",
      "--sidebar": "oklch(0.18 0.03 25)",
      "--sidebar-primary": "oklch(0.65 0.20 30)",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    preview: "linear-gradient(135deg, #0d0d1a, #1a0d2e)",
    lightVars: {
      "--background": "oklch(0.98 0.02 310)",
      "--foreground": "oklch(0.20 0.06 310)",
      "--card": "oklch(1 0.01 310)",
      "--card-foreground": "oklch(0.20 0.06 310)",
      "--primary": "oklch(0.50 0.20 310)",
      "--primary-foreground": "oklch(0.98 0.01 310)",
      "--secondary": "oklch(0.94 0.05 310)",
      "--secondary-foreground": "oklch(0.30 0.12 310)",
      "--muted": "oklch(0.94 0.05 310)",
      "--muted-foreground": "oklch(0.50 0.08 310)",
      "--accent": "oklch(0.94 0.05 310)",
      "--accent-foreground": "oklch(0.30 0.12 310)",
      "--border": "oklch(0.90 0.06 310)",
      "--input": "oklch(0.90 0.06 310)",
      "--ring": "oklch(0.50 0.20 310)",
      "--sidebar": "oklch(0.96 0.03 310)",
      "--sidebar-primary": "oklch(0.50 0.20 310)",
    },
    darkVars: {
      "--background": "oklch(0.13 0.03 300)",
      "--foreground": "oklch(0.95 0.02 310)",
      "--card": "oklch(0.18 0.04 300)",
      "--card-foreground": "oklch(0.95 0.02 310)",
      "--primary": "oklch(0.70 0.25 320)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.22 0.05 295)",
      "--secondary-foreground": "oklch(0.95 0.02 310)",
      "--muted": "oklch(0.22 0.04 300)",
      "--muted-foreground": "oklch(0.65 0.06 310)",
      "--accent": "oklch(0.28 0.08 300)",
      "--accent-foreground": "oklch(0.95 0.02 310)",
      "--border": "oklch(0.35 0.08 310 / 25%)",
      "--input": "oklch(0.28 0.06 300 / 40%)",
      "--ring": "oklch(0.60 0.20 320)",
      "--sidebar": "oklch(0.16 0.04 300)",
      "--sidebar-primary": "oklch(0.70 0.25 320)",
    },
  },
];

// ── Font Definitions ────────────────────────────────────────────

export const FONT_OPTIONS = [
  { id: "geist", name: "Geist", value: "'Geist Variable', sans-serif" },
  { id: "inter", name: "Inter", value: "'Inter', sans-serif" },
  { id: "jetbrains", name: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { id: "system", name: "System", value: "system-ui, sans-serif" },
];

export type ThemeMode = "light" | "dark" | "system";

// ── Theme State ─────────────────────────────────────────────────

interface ThemeState {
  theme: ThemeMode;
  paletteId: string;
  fontId: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  palettes: ThemePalette[];
  fonts: typeof FONT_OPTIONS;
  currentPalette: string;
  currentFont: string;
  setPalette: (id: string) => void;
  setFont: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "scrcpygui-theme";

function loadTheme(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { theme: "system", paletteId: "default", fontId: "geist" };
}

function saveTheme(state: ThemeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyPalette(id: string, isDark: boolean) {
  const palette = PALETTES.find((p) => p.id === id);
  if (!palette) return;

  const root = document.documentElement;
  // Clear any existing inline properties first so we don't leak variables
  // Doing it by resetting style is hard, so we just overwrite all keys from both
  const allKeys = new Set([...Object.keys(palette.lightVars), ...Object.keys(palette.darkVars)]);
  allKeys.forEach((key) => root.style.removeProperty(key));

  const vars = isDark ? palette.darkVars : palette.lightVars;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function applyFont(id: string) {
  const font = FONT_OPTIONS.find((f) => f.id === id);
  if (!font) return;
  document.documentElement.style.setProperty("--font-sans", font.value);
}

// ── Provider ────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(loadTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    
    let isDark = state.theme === "dark";
    if (state.theme === "system") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }

    applyPalette(state.paletteId, isDark);
    applyFont(state.fontId);
    saveTheme(state);
  }, [state]);

  // Handle system theme changes
  useEffect(() => {
    if (state.theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(isDark ? "dark" : "light");
      applyPalette(state.paletteId, isDark);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [state.theme, state.paletteId]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setPalette = useCallback((id: string) => {
    setState((prev) => ({ ...prev, paletteId: id }));
  }, []);

  const setFont = useCallback((id: string) => {
    setState((prev) => ({ ...prev, fontId: id }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: state.theme,
        setTheme,
        palettes: PALETTES,
        fonts: FONT_OPTIONS,
        currentPalette: state.paletteId,
        currentFont: state.fontId,
        setPalette,
        setFont,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

