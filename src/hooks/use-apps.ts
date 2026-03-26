import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";

export function useApps(serial: string | null) {
  const queryClient = useQueryClient();

  // Queries
  const { data: apps = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["apps", serial],
    queryFn: () => api.listPackages(serial!),
    enabled: !!serial,
    staleTime: 5000,
  });

  // Mutations
  const uninstallMutation = useMutation({
    mutationFn: (pkg: string) => api.uninstallApp(serial!, pkg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps", serial] });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: (pkg: string) => api.clearAppData(serial!, pkg),
  });

  const forceStopMutation = useMutation({
    mutationFn: (pkg: string) => api.forceStopApp(serial!, pkg),
  });

  const launchMutation = useMutation({
    mutationFn: (pkg: string) => api.launchApp(serial!, pkg),
  });

  const virtualDisplayMutation = useMutation({
    mutationFn: ({ pkg, resolution = "" }: { pkg: string; resolution?: string }) => 
      api.startVirtualDisplay(serial!, pkg, resolution),
  });

  const installMutation = useMutation({
    mutationFn: (path: string) => api.installApk(serial!, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps", serial] });
    },
  });

  return {
    apps,
    isLoading,
    isError,
    error,
    refetch,
    uninstallApp: uninstallMutation.mutateAsync,
    isUninstalling: uninstallMutation.isPending,
    clearAppData: clearDataMutation.mutateAsync,
    isClearing: clearDataMutation.isPending,
    forceStopApp: forceStopMutation.mutateAsync,
    isForceStopping: forceStopMutation.isPending,
    launchApp: launchMutation.mutateAsync,
    isLaunching: launchMutation.isPending,
    startVirtualDisplay: virtualDisplayMutation.mutateAsync,
    isStartingVirtual: virtualDisplayMutation.isPending,
    installApk: installMutation.mutateAsync,
    isInstalling: installMutation.isPending,
  };
}
