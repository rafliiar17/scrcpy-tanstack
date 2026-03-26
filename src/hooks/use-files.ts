import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";

export function useFiles(serial: string | null, path: string) {
  const queryClient = useQueryClient();

  // Queries
  const { data: files = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["files", serial, path],
    queryFn: () => api.listFiles(serial!, path),
    enabled: !!serial && !!path,
    staleTime: 5000,
  });

  // Mutations
  const pullMutation = useMutation({
    mutationFn: ({ remote, local, size, downloadId }: { remote: string; local: string; size: number; downloadId?: string }) => 
      api.pullFile(serial!, remote, local, size, downloadId),
  });

  const pushMutation = useMutation({
    mutationFn: ({ local, remote }: { local: string; remote: string }) => 
      api.pushFile(serial!, local, remote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", serial, path] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (targetPath: string) => api.deleteFile(serial!, targetPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", serial, path] });
    },
  });

  const mkdirMutation = useMutation({
    mutationFn: (targetPath: string) => api.createDirectory(serial!, targetPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", serial, path] });
    },
  });

  return {
    files,
    isLoading,
    isError,
    error,
    refetch,
    pullFile: pullMutation.mutateAsync,
    isPulling: pullMutation.isPending,
    pushFile: pushMutation.mutateAsync,
    isPushing: pushMutation.isPending,
    deleteFile: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    createDirectory: mkdirMutation.mutateAsync,
    isCreatingDir: mkdirMutation.isPending,
  };
}
