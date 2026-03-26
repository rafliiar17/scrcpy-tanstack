import { createContext, useContext, type ReactNode } from "react";
import { useDownloadManager, DownloadProgress } from "@/components/download-progress";
import type { DownloadItem } from "@/components/download-progress";

interface DownloadContextType {
  downloads: DownloadItem[];
  addDownload: (id: string, filename: string, size: number) => void;
  completeDownload: (id: string) => void;
  failDownload: (id: string, error: string) => void;
  dismissDownload: (id: string) => void;
  clearCompleted: () => void;
  cancelDownload: (id: string) => void;
}

const DownloadContext = createContext<DownloadContextType | null>(null);

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error("useDownloads must be inside DownloadProvider");
  return ctx;
}

export function DownloadProvider({ children }: { children: ReactNode }) {
  const manager = useDownloadManager();

  return (
    <DownloadContext.Provider value={manager}>
      {children}
      <DownloadProgress
        downloads={manager.downloads}
        onDismiss={manager.dismissDownload}
        onClearCompleted={manager.clearCompleted}
        onCancel={manager.cancelDownload}
      />
    </DownloadContext.Provider>
  );
}
