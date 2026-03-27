import React, { Suspense } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DownloadProvider } from "@/components/download-provider";
import { CommandPalette } from "@/components/command-palette";
import { useHashRoute } from "@/hooks/use-hash-route";

// Lazy-loaded components for code-splitting
const DashboardPage = React.lazy(() => import("@/pages/dashboard").then(m => ({ default: m.DashboardPage })));
const MirrorPage = React.lazy(() => import("@/pages/mirror").then(m => ({ default: m.MirrorPage })));
const LivestreamPage = React.lazy(() => import("@/pages/livestream").then(m => ({ default: m.LivestreamPage })));
const CameraPage = React.lazy(() => import("@/pages/camera").then(m => ({ default: m.CameraPage })));
const DevicesPage = React.lazy(() => import("@/pages/devices").then(m => ({ default: m.DevicesPage })));
const AppsPage = React.lazy(() => import("@/pages/apps").then(m => ({ default: m.AppsPage })));
const FilesPage = React.lazy(() => import("@/pages/files").then(m => ({ default: m.FilesPage })));
const GalleryPage = React.lazy(() => import("@/pages/gallery").then(m => ({ default: m.GalleryPage })));
const MonitorPage = React.lazy(() => import("@/pages/monitor").then(m => ({ default: m.MonitorPage })));
const LogsPage = React.lazy(() => import("@/pages/logs").then(m => ({ default: m.LogsPage })));
const SettingsPage = React.lazy(() => import("@/pages/settings").then(m => ({ default: m.SettingsPage })));
const ShellPage = React.lazy(() => import("@/pages/shell").then(m => ({ default: m.ShellPage })));
const ClipboardPage = React.lazy(() => import("./pages/clipboard").then(m => ({ default: m.ClipboardPage })));

// ── Simple hash-based routing for Tauri SPA ──────────────────────

const routes: Record<string, { title: string; component: React.FC }> = {
  "/": { title: "Dashboard", component: DashboardPage },
  "/streaming/mirror": { title: "Mirror", component: MirrorPage },
  "/streaming/live": { title: "Livestream", component: LivestreamPage },
  "/streaming/camera": { title: "Camera", component: CameraPage },
  "/management/devices": { title: "Devices", component: DevicesPage },
  "/management/apps": { title: "Apps", component: AppsPage },
  "/management/files": { title: "Files", component: FilesPage },
  "/management/gallery": { title: "Gallery", component: GalleryPage },
  "/management/clipboard": { title: "Clipboard", component: ClipboardPage },
  "/system/monitor": { title: "Monitor", component: MonitorPage },
  "/system/logs": { title: "Logcat", component: LogsPage },
  "/system/settings": { title: "Settings", component: SettingsPage },
  "/system/shell": { title: "Interactive Shell", component: ShellPage },
};

export function App() {
  const currentPath = useHashRoute();
  const route = routes[currentPath] ?? routes["/"];
  const PageComponent = route.component;

  return (
    <>
    <TooltipProvider>
      <DownloadProvider>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-50 bg-background">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <h1 className="text-sm font-medium">{route.title}</h1>
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Suspense fallback={<div className="flex h-full items-center justify-center p-6 text-muted-foreground">Loading module...</div>}>
                <PageComponent />
              </Suspense>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </DownloadProvider>
    </TooltipProvider>
    <CommandPalette />
    </>
  );
}
