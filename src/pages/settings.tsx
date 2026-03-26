import { useState } from "react";
import { Settings, Save, RotateCcw, FolderOpen, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_VERSION } from "@/lib/config";

interface AppSettings {
  scrcpyPath: string;
  adbPath: string;
  defaultSavePath: string;
  theme: string;
  autoConnect: boolean;
  pollInterval: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  scrcpyPath: "scrcpy",
  adbPath: "adb",
  defaultSavePath: "~/Downloads",
  theme: "system",
  autoConnect: true,
  pollInterval: 5000,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Future: persist to tauri store
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Configure application preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4 mr-2" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="size-4 mr-2" /> {saved ? "Saved ✓" : "Save"}
          </Button>
        </div>
      </div>

      {/* Binary Paths */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="size-5 text-blue-500" />
            Binary Paths
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Scrcpy Binary</label>
            <input
              type="text"
              value={settings.scrcpyPath}
              onChange={(e) => updateField("scrcpyPath", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="/usr/bin/scrcpy"
            />
            <p className="text-xs text-muted-foreground mt-1">Path to scrcpy executable. Use "scrcpy" if it's in your PATH.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">ADB Binary</label>
            <input
              type="text"
              value={settings.adbPath}
              onChange={(e) => updateField("adbPath", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="/usr/bin/adb"
            />
          </div>
        </CardContent>
      </Card>

      {/* File Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="size-5 text-orange-500" />
            File Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Default Save Path</label>
            <input
              type="text"
              value={settings.defaultSavePath}
              onChange={(e) => updateField("defaultSavePath", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="~/Downloads"
            />
            <p className="text-xs text-muted-foreground mt-1">Default folder for pulled files and screenshots.</p>
          </div>
        </CardContent>
      </Card>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="size-5 text-purple-500" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => updateField("theme", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="system">System Auto</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Device Poll Interval</label>
            <select
              value={settings.pollInterval}
              onChange={(e) => updateField("pollInterval", Number(e.target.value))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value={3000}>3 seconds (Fast)</option>
              <option value={5000}>5 seconds (Default)</option>
              <option value={10000}>10 seconds (Battery Saver)</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            <input
              type="checkbox"
              id="autoConnect"
              checked={settings.autoConnect}
              onChange={(e) => updateField("autoConnect", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoConnect" className="text-sm">
              <span className="font-medium">Auto-select first device</span>
              <span className="text-muted-foreground block text-xs">
                Automatically select the first detected device on startup
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-muted/10 border-dashed">
        <CardContent className="py-6 text-center">
          <h3 className="font-bold text-lg">{APP_NAME}</h3>
          <p className="text-muted-foreground text-sm">Version {APP_VERSION}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Built with Tauri v2 · React · TanStack · shadcn/ui
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
