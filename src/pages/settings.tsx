import { useState } from "react";
import { Settings, Save, RotateCcw, FolderOpen, Terminal, Palette, Type, Server, Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_NAME, APP_VERSION } from "@/lib/config";
import { useTheme } from "@/hooks/use-theme";
import { useSettings, type AppSettings } from "@/hooks/use-settings";

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [saved, setSaved] = useState(false);
  const { theme, setTheme, palettes, fonts, currentPalette, currentFont, setPalette, setFont } = useTheme();

  const handleSave = () => {
    // With auto-save in context this is mostly visual feedback
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetSettings();
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
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

      {/* Theme Engine */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="size-5 text-purple-500" />
            Theme Engine
            <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full font-normal">NEW</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-7">
          {/* Mode Selector */}
          <div>
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              Appearance Mode
            </label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "light"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-transparent bg-muted/30 hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                <Sun className="size-4" /> <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "dark"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-transparent bg-muted/30 hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                <Moon className="size-4" /> <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                  theme === "system"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-transparent bg-muted/30 hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                <Monitor className="size-4" /> <span className="text-sm font-medium">System</span>
              </button>
            </div>
          </div>

          {/* Palette Selector */}
          <div>
            <label className="text-sm font-medium mb-3 block">Color Palette</label>
            <div className="grid grid-cols-5 gap-3">
              {palettes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    currentPalette === p.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-transparent bg-muted/30 hover:bg-muted/60 hover:border-muted-foreground/20"
                  }`}
                >
                  <div
                    className="w-full h-8 rounded-lg shadow-inner"
                    style={{ background: p.preview }}
                  />
                  <span className="text-xs font-medium">{p.name}</span>
                  {currentPalette === p.id && (
                    <div className="absolute -top-1 -right-1 size-4 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[8px] text-primary-foreground">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Selector */}
          <div>
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Type className="size-4" /> Font Family
            </label>
            <div className="grid grid-cols-4 gap-3">
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                    currentFont === f.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-transparent bg-muted/30 hover:bg-muted/60 hover:border-muted-foreground/20"
                  }`}
                >
                  <span className="text-sm font-medium" style={{ fontFamily: f.value }}>
                    {f.name}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: f.value }}>
                    Aa Bb Cc 123
                  </p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADB Proxy / Server */}
      <Card className="border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="size-5 text-cyan-500" />
            ADB Server
            <span className="text-xs bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded-full font-normal">Proxy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to a remote ADB server instead of the local daemon. Leave empty to use the default local server.
          </p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Host</label>
              <Input
                placeholder="192.168.1.100 (leave empty for local)"
                value={settings.adbServerHost}
                onChange={(e) => updateField("adbServerHost", e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="w-28 space-y-1">
              <label className="text-sm font-medium">Port</label>
              <Input
                placeholder="5037"
                value={settings.adbServerPort}
                onChange={(e) => updateField("adbServerPort", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border text-sm text-muted-foreground">
            <Server className="size-4 shrink-0" />
            {settings.adbServerHost ? (
              <span>Using remote server: <strong className="text-foreground font-mono">{settings.adbServerHost}:{settings.adbServerPort}</strong></span>
            ) : (
              <span>Using local ADB daemon (default)</span>
            )}
          </div>
        </CardContent>
      </Card>

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
            <label className="text-sm font-medium mb-1.5 block">Download Path</label>
            <Input
              type="text"
              value={settings.downloadPath}
              onChange={(e) => updateField("downloadPath", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="~/Downloads"
            />
            <p className="text-xs text-muted-foreground mt-1">Default folder for pulled files.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Recordings & Screenshots Path</label>
            <Input
              type="text"
              value={settings.recordingsPath}
              onChange={(e) => updateField("recordingsPath", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="~/Videos"
            />
            <p className="text-xs text-muted-foreground mt-1">Folder for screen records and camera shots.</p>
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
            <label className="text-sm font-medium mb-1.5 block">Device Poll Interval</label>
            <Select
              value={settings.pollInterval.toString()}
              onValueChange={(val) => updateField("pollInterval", Number(val))}
            >
              <SelectTrigger className="w-full bg-background h-10">
                <SelectValue placeholder="Select poll interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3000">3 seconds (Fast)</SelectItem>
                <SelectItem value="5000">5 seconds (Default)</SelectItem>
                <SelectItem value="10000">10 seconds (Battery Saver)</SelectItem>
              </SelectContent>
            </Select>
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
