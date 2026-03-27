import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";

export function useSystem() {
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: ({ ip, port }: { ip: string; port: string }) => api.tcpipConnect(ip, port),
    onSuccess: () => {
      // Invalidate devices query to refresh the list automatically
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (target: string) => api.tcpipDisconnect(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const enableTcpipMutation = useMutation({
    mutationFn: (serial: string) => api.enableTcpip(serial),
  });

  const rebootMutation = useMutation({
    mutationFn: ({ serial, mode }: { serial: string; mode: string }) => api.rebootDevice(serial, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const shellMutation = useMutation({
    mutationFn: ({ serial, command }: { serial: string; command: string }) => api.shellRun(serial, command),
  });

  const pairMutation = useMutation({
    mutationFn: ({ ip, port, code }: { ip: string; port: string; code: string }) =>
      api.adbPair(ip, port, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const discoverMutation = useMutation({
    mutationFn: () => api.adbMdnsDiscover(),
  });

  return {
    tcpipConnect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    
    tcpipDisconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    
    enableTcpip: enableTcpipMutation.mutateAsync,
    isEnablingTcpip: enableTcpipMutation.isPending,

    rebootDevice: rebootMutation.mutateAsync,
    isRebooting: rebootMutation.isPending,

    shellRun: shellMutation.mutateAsync,
    isRunningShell: shellMutation.isPending,

    pairDevice: pairMutation.mutateAsync,
    isPairing: pairMutation.isPending,

    discoverDevices: discoverMutation.mutateAsync,
    isDiscovering: discoverMutation.isPending,
    discoveredDevices: discoverMutation.data ?? [],
    
    startLogcat: api.startLogcat,
    stopLogcat: api.stopLogcat,
  };
}
