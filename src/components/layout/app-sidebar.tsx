import {
  Monitor,
  Radio,
  Camera,
  Package,
  FolderOpen,
  Image,
  Activity,
  ScrollText,
  Settings,
  Smartphone,
  Terminal,
  Clipboard,
  ShieldCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { DeviceSelector } from "./device-selector";
import { APP_NAME, APP_VERSION } from "@/lib/config";

import { useHashRoute } from "@/hooks/use-hash-route";

// ... (keep the rest of the file contents)

const navStreaming = [
  { title: "Mirror", icon: Monitor, url: "#/streaming/mirror" },
  { title: "Livestream", icon: Radio, url: "#/streaming/live" },
  { title: "Camera", icon: Camera, url: "#/streaming/camera" },
];

const navManagement = [
  { title: "Devices", icon: Smartphone, url: "#/management/devices" },
  { title: "Apps", icon: Package, url: "#/management/apps" },
  { title: "Files", icon: FolderOpen, url: "#/management/files" },
  { title: "Gallery", icon: Image, url: "#/management/gallery" },
  { title: "Clipboard", icon: Clipboard, url: "#/management/clipboard" },
];

const navSystem = [
  { title: "Monitor", icon: Activity, url: "#/system/monitor" },
  { title: "Logcat", icon: ScrollText, url: "#/system/logs" },
  { title: "Shell", icon: Terminal, url: "#/system/shell" },
  { title: "Settings", icon: Settings, url: "#/system/settings" },
  { title: "Mi Unlock", icon: ShieldCheck, url: "#/system/unlock" },
];

// ── Component ────────────────────────────────────────────────────

interface AppSidebarProps {
  badges?: Record<string, string | number>;
}

export function AppSidebar({ badges = {} }: AppSidebarProps) {
  const currentPath = useHashRoute();

  const renderNavGroup = (
    label: string,
    items: typeof navStreaming
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = currentPath === item.url.replace("#", "");
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title} 
                isActive={isActive}
                render={<a href={item.url} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
              {badges[item.title] !== undefined && (
                <SidebarMenuBadge>{badges[item.title]}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <DeviceSelector />
      </SidebarHeader>

      <SidebarContent>
        {renderNavGroup("Streaming", navStreaming)}
        {renderNavGroup("Management", navManagement)}
        {renderNavGroup("System", navSystem)}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {APP_NAME} v{APP_VERSION}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
