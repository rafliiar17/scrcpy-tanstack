import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AppSettings {
  scrcpyPath: string;
  adbPath: string;
  downloadPath: string;
  recordingsPath: string;
  autoConnect: boolean;
  pollInterval: number;
  adbServerHost: string;
  adbServerPort: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  scrcpyPath: "scrcpy",
  adbPath: "adb",
  downloadPath: "~/Downloads",
  recordingsPath: "~/Videos",
  autoConnect: true,
  pollInterval: 5000,
  adbServerHost: "",
  adbServerPort: "5037",
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = "scrcpygui-settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Merge with default to ensure new fields are populated
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
