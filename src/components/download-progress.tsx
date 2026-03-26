import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download, Loader2, X, StopCircle } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";

// ── Types ─────────────────────────────────────────────────────────

export interface DownloadItem {
  id: string;
  filename: string;
  size: number;
  status: "pending" | "downloading" | "success" | "error";
  error?: string;
  startTime: number;
  endTime?: number;
  percent?: number;
  speed?: string;
  bytesTransferred?: number;
}

interface PullProgressEvent {
  download_id: string;
  percent: number;
  speed: string;
  bytes_transferred: number;
  done: boolean;
  success: boolean;
  error: string;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useDownloadManager() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const addDownload = useCallback((id: string, filename: string, size: number) => {
    setDownloads((prev) => [
      { id, filename, size, status: "downloading", startTime: Date.now(), percent: 0, speed: "" },
      ...prev.filter((d) => d.id !== id),
    ]);
  }, []);

  const updateDownloadProgress = useCallback((id: string, percent: number, speed: string, bytesTransferred: number) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, percent, speed, bytesTransferred } : d))
    );
  }, []);

  const completeDownload = useCallback((id: string) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "success" as const, endTime: Date.now(), percent: 100, speed: "" } : d))
    );
  }, []);

  const failDownload = useCallback((id: string, error: string) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "error" as const, error, endTime: Date.now(), speed: "" } : d))
    );
  }, []);

  const dismissDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.status === "downloading" || d.status === "pending"));
  }, []);

  const cancelDownload = useCallback(async (id: string) => {
    try {
      await api.cancelPull(id);
      failDownload(id, "Cancelled by user");
    } catch (err) {
      console.error("Failed to cancel download:", err);
    }
  }, [failDownload]);

  // Listen for backend progress events
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    
    const setupListener = async () => {
      unlistenFn = await listen<PullProgressEvent>("pull-progress", (event) => {
        const payload = event.payload;
        if (payload.done) {
          if (payload.success) {
            completeDownload(payload.download_id);
          } else {
            failDownload(payload.download_id, payload.error || "Failed");
          }
        } else {
          updateDownloadProgress(payload.download_id, payload.percent, payload.speed, payload.bytes_transferred);
        }
      });
    };

    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [completeDownload, failDownload, updateDownloadProgress]);

  return { downloads, addDownload, completeDownload, failDownload, dismissDownload, clearCompleted, cancelDownload };
}

// ── Helpers ───────────────────────────────────────────────────────

function getFormattedSpeed(item: DownloadItem): string {
  // If backend provided a speed string, use it
  if (item.status === "downloading" && item.speed) {
    return item.speed;
  }
  
  const elapsed = ((item.endTime || Date.now()) - item.startTime) / 1000;
  if (elapsed <= 0) return "--";

  // Use bytesTransferred if available and not done
  if (item.status === "downloading") {
     const bytes = item.bytesTransferred || (item.size * (item.percent || 0)) / 100;
     if (bytes <= 0) return "--";
     return `${formatBytes(bytes / elapsed)}/s`;
  }

  // For completed downloads, use total size
  if (item.size <= 0) return "--";
  return `${formatBytes(item.size / elapsed)}/s`;
}

function getDuration(item: DownloadItem): string {
  const elapsed = ((item.endTime || Date.now()) - item.startTime) / 1000;
  if (elapsed < 1) return "<1s";
  if (elapsed < 60) return `${Math.round(elapsed)}s`;
  return `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`;
}

// ── Component ─────────────────────────────────────────────────────

interface DownloadProgressProps {
  downloads: DownloadItem[];
  onDismiss: (id: string) => void;
  onClearCompleted: () => void;
  onCancel: (id: string) => void;
}

export function DownloadProgress({ downloads, onDismiss, onClearCompleted, onCancel }: DownloadProgressProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (downloads.length === 0) return null;

  const activeCount = downloads.filter((d) => d.status === "downloading").length;
  const doneCount = downloads.filter((d) => d.status !== "downloading" && d.status !== "pending").length;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-96 max-h-[70vh] flex flex-col rounded-xl border bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Download className="size-4" />
          <span className="text-sm font-semibold">Downloads</span>
          {activeCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {doneCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                onClearCompleted();
              }}
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
          >
            <span className="text-xs">{collapsed ? "▲" : "▼"}</span>
          </Button>
        </div>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="overflow-y-auto max-h-[400px] divide-y divide-border">
          {downloads.map((item) => (
            <div key={item.id} className="px-4 py-3 space-y-2">
              {/* Filename + dismiss/cancel */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.status === "downloading" && (
                    <Loader2 className="size-4 animate-spin text-blue-500 shrink-0" />
                  )}
                  {item.status === "success" && (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="size-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate" title={item.filename}>
                    {item.filename}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {item.status === "downloading" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => onCancel(item.id)}
                      title="Cancel download"
                    >
                      <StopCircle className="size-3" />
                    </Button>
                  )}
                  {item.status !== "downloading" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 shrink-0"
                      onClick={() => onDismiss(item.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {item.status === "downloading" && (
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300" 
                    style={{ width: `${item.percent || 0}%` }}
                  />
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{formatBytes(item.size)}</span>
                  {item.status === "downloading" && item.percent !== undefined && (
                    <span className="font-medium text-primary">{item.percent}%</span>
                  )}
                </div>
                <span>
                  {item.status === "downloading" && (
                    <span className="flex items-center gap-1">
                      <span className="animate-pulse">●</span> {getFormattedSpeed(item)}
                    </span>
                  )}
                  {item.status === "success" && (
                    <span className="text-green-600">
                      ✓ {getFormattedSpeed(item)} · {getDuration(item)}
                    </span>
                  )}
                  {item.status === "error" && (
                    <span className="text-red-500">✗ {item.error === "Cancelled by user" ? "Cancelled" : "Failed"}</span>
                  )}
                </span>
              </div>

              {/* Error message */}
              {item.status === "error" && item.error && item.error !== "Cancelled by user" && (
                <p
                  className="text-xs text-red-400 bg-red-500/5 rounded px-2 py-1 truncate"
                  title={item.error}
                >
                  {item.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
