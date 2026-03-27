import { ChevronsUpDown, Smartphone, Wifi, Usb, AlertCircle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDevices, useSelectedDevice } from "@/hooks/use-devices";
import type { DeviceInfo } from "@/lib/config";

export function DeviceSelector() {
  const { data: devices, isLoading } = useDevices();
  const { selectedDevice, setSelectedDevice } = useSelectedDevice();

  const handleSelect = (device: DeviceInfo) => {
    setSelectedDevice(device);
  };

  const displayName = selectedDevice
    ? selectedDevice.model
    : isLoading
      ? "Scanning..."
      : "No Device";

  const displaySerial = selectedDevice?.serial ?? "Connect a device via USB or WiFi";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Smartphone className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {displaySerial}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            align="start"
          >
            {!devices || devices.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">
                  {isLoading ? "Scanning for devices..." : "No devices found"}
                </span>
              </DropdownMenuItem>
            ) : (
              devices.map((device) => (
                <DropdownMenuItem
                  key={device.serial}
                  onClick={() => handleSelect(device)}
                  className="flex items-center gap-2"
                >
                  {device.connection_type === "wifi" ? (
                    <Wifi className="size-4 text-blue-500" />
                  ) : (
                    <Usb className="size-4 text-green-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{device.model}</span>
                    <span className="text-xs text-muted-foreground">
                      {device.serial}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {device.status === "device" ? (
                      <span className="size-2 rounded-full bg-green-500 inline-block" />
                    ) : device.status === "unauthorized" ? (
                      <>
                        <AlertCircle className="size-3 text-yellow-500" />
                        <span className="size-2 rounded-full bg-yellow-500 inline-block" />
                      </>
                    ) : (
                      <span className="size-2 rounded-full bg-red-500 inline-block" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
