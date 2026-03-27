import { useSelectedDevice, useDeviceInfo } from "@/hooks/use-devices";
import { useSystem } from "@/hooks/use-system";
import { Smartphone, Monitor, Package, FolderOpen, Power } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function DashboardPage() {
  const { selectedDevice } = useSelectedDevice();
  const { data: deviceInfo } = useDeviceInfo(selectedDevice?.serial ?? null);
  const { rebootDevice, isRebooting } = useSystem();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Android Device Manager — Connect a device to get started.
        </p>
      </div>

      {selectedDevice && deviceInfo ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Smartphone className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Model</p>
                <p className="text-lg font-semibold">{deviceInfo.model}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Android</p>
            <p className="text-lg font-semibold">{deviceInfo.android_version}</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Resolution</p>
            <p className="text-lg font-semibold">{deviceInfo.resolution || "N/A"}</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Battery</p>
            <p className="text-lg font-semibold">{deviceInfo.battery || "N/A"}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16">
          <Smartphone className="size-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No device selected</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Connect an Android device via USB or select one from the sidebar
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <a href="#/streaming/mirror" className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
          <Monitor className="size-6 text-muted-foreground group-hover:text-foreground mb-3" />
          <h3 className="font-semibold">Mirror</h3>
          <p className="text-sm text-muted-foreground">Screen mirror your device</p>
        </a>
        <a href="#/management/apps" className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
          <Package className="size-6 text-muted-foreground group-hover:text-foreground mb-3" />
          <h3 className="font-semibold">Apps</h3>
          <p className="text-sm text-muted-foreground">Manage installed packages</p>
        </a>
        <a href="#/management/files" className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
          <FolderOpen className="size-6 text-muted-foreground group-hover:text-foreground mb-3" />
          <h3 className="font-semibold">Files</h3>
          <p className="text-sm text-muted-foreground">Browse device storage</p>
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!selectedDevice || isRebooting}
            className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent hover:border-red-500/50 text-left disabled:opacity-50"
          >
            <Power className={`size-6 mb-3 ${isRebooting ? "animate-pulse text-red-500" : "text-muted-foreground group-hover:text-red-500"}`} />
            <h3 className="font-semibold">{isRebooting ? "Rebooting..." : "Reboot"}</h3>
            <p className="text-sm text-muted-foreground">Restart Android device</p>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => selectedDevice && rebootDevice({ serial: selectedDevice.serial, mode: "" })}>
              System
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => selectedDevice && rebootDevice({ serial: selectedDevice.serial, mode: "recovery" })}>
              Recovery
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => selectedDevice && rebootDevice({ serial: selectedDevice.serial, mode: "bootloader" })}>
              Bootloader
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
