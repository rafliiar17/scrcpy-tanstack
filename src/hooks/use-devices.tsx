import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "@/lib/tauri";
import { QUERY_STALE_TIME, type DeviceInfo } from "@/lib/config";

// ── Queries ──────────────────────────────────────────────────────

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: api.listDevices,
    staleTime: QUERY_STALE_TIME.devices,
    refetchInterval: QUERY_STALE_TIME.devices,
  });
}

export function useDeviceInfo(serial: string | null) {
  return useQuery({
    queryKey: ["deviceInfo", serial],
    queryFn: () => api.getDeviceInfo(serial!),
    staleTime: QUERY_STALE_TIME.deviceInfo,
    enabled: !!serial,
  });
}

// ── Selected Device Context ──────────────────────────────────────

interface DeviceContextType {
  selectedDevice: DeviceInfo | null;
  setSelectedDevice: (device: DeviceInfo | null) => void;
}

const DeviceContext = createContext<DeviceContextType>({
  selectedDevice: null,
  setSelectedDevice: () => {},
});

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);

  return (
    <DeviceContext.Provider value={{ selectedDevice, setSelectedDevice }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useSelectedDevice() {
  return useContext(DeviceContext);
}
