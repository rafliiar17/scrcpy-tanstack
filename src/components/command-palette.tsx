import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Monitor, Radio, Camera, Smartphone, Package, FolderOpen,
  Image, Activity, ScrollText, Settings, Terminal, Search,
  ArrowRight, Wifi,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PaletteItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
}

const NAV_ITEMS: Omit<PaletteItem, "action">[] = [
  { id: "dashboard", title: "Dashboard", category: "Navigation", icon: Monitor, keywords: ["home", "overview"] },
  { id: "mirror", title: "Mirror", category: "Streaming", icon: Monitor, keywords: ["screen", "cast"] },
  { id: "livestream", title: "Livestream", category: "Streaming", icon: Radio, keywords: ["stream", "broadcast"] },
  { id: "camera", title: "Camera", category: "Streaming", icon: Camera, keywords: ["webcam", "video"] },
  { id: "devices", title: "Devices", category: "Management", icon: Smartphone, keywords: ["phone", "connect"] },
  { id: "apps", title: "Apps", category: "Management", icon: Package, keywords: ["packages", "install"] },
  { id: "files", title: "Files", category: "Management", icon: FolderOpen, keywords: ["folder", "browse"] },
  { id: "gallery", title: "Gallery", category: "Management", icon: Image, keywords: ["photos", "media"] },
  { id: "monitor", title: "System Monitor", category: "System", icon: Activity, keywords: ["cpu", "memory", "performance"] },
  { id: "logs", title: "Logcat", category: "System", icon: ScrollText, keywords: ["log", "debug"] },
  { id: "shell", title: "Interactive Shell", category: "System", icon: Terminal, keywords: ["terminal", "command", "adb"] },
  { id: "settings", title: "Settings", category: "System", icon: Settings, keywords: ["preferences", "config"] },
  { id: "tcpip", title: "Wireless ADB", category: "Connectivity", icon: Wifi, keywords: ["wifi", "tcp", "pair"] },
];

const ROUTE_MAP: Record<string, string> = {
  dashboard: "#/",
  mirror: "#/streaming/mirror",
  livestream: "#/streaming/live",
  camera: "#/streaming/camera",
  devices: "#/management/devices",
  apps: "#/management/apps",
  files: "#/management/files",
  gallery: "#/management/gallery",
  monitor: "#/system/monitor",
  logs: "#/system/logs",
  shell: "#/system/shell",
  settings: "#/system/settings",
  tcpip: "#/connectivity/tcpip",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const items: PaletteItem[] = useMemo(() =>
    NAV_ITEMS.map((item) => ({
      ...item,
      action: () => {
        window.location.hash = ROUTE_MAP[item.id] ?? "#/";
        setOpen(false);
      },
    })),
  []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords?.some((kw) => kw.includes(q))
    );
  }, [query, items]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      }
    },
    [filtered, selectedIndex]
  );

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const items = map.get(item.category) ?? [];
      items.push(item);
      map.set(item.category, items);
    }
    return map;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden rounded-xl border shadow-2xl bg-background/95 backdrop-blur-xl [&>button]:hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search pages, tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-12 text-sm placeholder:text-muted-foreground/50"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for "<span className="font-medium text-foreground">{query}</span>"
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {category}
                </div>
                {items.map((item) => {
                  const globalIndex = filtered.indexOf(item);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <item.icon className="size-4 shrink-0 opacity-60" />
                      <span className="flex-1 text-left">{item.title}</span>
                      {isSelected && <ArrowRight className="size-3 opacity-40" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            <span>Navigate</span>
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px] ml-2">↵</kbd>
            <span>Open</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">K</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
