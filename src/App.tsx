import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DownloadProvider } from "@/components/download-provider";
import { DashboardPage } from "@/pages/dashboard";
import { MirrorPage } from "@/pages/mirror";
import { LivestreamPage } from "@/pages/livestream";
import { CameraPage } from "@/pages/camera";
import { DevicesPage } from "@/pages/devices";
import { AppsPage } from "@/pages/apps";
import { FilesPage } from "@/pages/files";
import { GalleryPage } from "@/pages/gallery";
import { MonitorPage } from "@/pages/monitor";
import { LogsPage } from "@/pages/logs";
import { SettingsPage } from "@/pages/settings";
import { ShellPage } from "@/pages/shell";

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
  "/system/monitor": { title: "Monitor", component: MonitorPage },
  "/system/logs": { title: "Logcat", component: LogsPage },
  "/system/settings": { title: "Settings", component: SettingsPage },
  "/system/shell": { title: "Interactive Shell", component: ShellPage },
};

import { useHashRoute } from "@/hooks/use-hash-route";

export function App() {
  const currentPath = useHashRoute();
  const route = routes[currentPath] ?? routes["/"];
  const PageComponent = route.component;

  return (
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
              <PageComponent />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </DownloadProvider>
    </TooltipProvider>
  );
}
