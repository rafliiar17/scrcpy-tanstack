import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, RefreshCw, Download, Trash2, Film, Camera, FileImage, Grid3x3, List } from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useDownloads } from "@/components/download-provider";
import { api } from "@/lib/tauri";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MediaFile {
  name: string;
  size: number;
  is_dir: boolean;
  modified: string;
}

const MEDIA_PATHS = [
  { label: "Photos", path: "/sdcard/DCIM/Camera/", icon: Camera },
  { label: "Screenshots", path: "/sdcard/Pictures/Screenshots/", icon: FileImage },
  { label: "Screen Recordings", path: "/sdcard/Movies/", icon: Film },
  { label: "Downloads", path: "/sdcard/Download/", icon: Download },
];

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
const VIDEO_EXTS = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".3gp"];

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getMediaType(name: string): "image" | "video" | "other" {
  const lower = name.toLowerCase();
  if (IMAGE_EXTS.some((ext) => lower.endsWith(ext))) return "image";
  if (VIDEO_EXTS.some((ext) => lower.endsWith(ext))) return "video";
  return "other";
}

export function GalleryPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial;
  const queryClient = useQueryClient();

  const [activeFolder, setActiveFolder] = useState(MEDIA_PATHS[0]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ["gallery", serial, activeFolder.path],
    queryFn: async () => {
      const result = await api.listFiles(serial!, activeFolder.path);
      return result
        .filter((f: MediaFile) => !f.is_dir && getMediaType(f.name) !== "other")
        .sort((a: MediaFile, b: MediaFile) => b.modified.localeCompare(a.modified));
    },
    enabled: !!serial,
  });

  const { addDownload, completeDownload, failDownload, downloads } = useDownloads();

  const pullMutation = useMutation({
    mutationFn: async ({ filename, size }: { filename: string; size: number }) => {
      const remote = `${activeFolder.path}${filename}`;
      const local = `~/Downloads/${filename}`;
      const downloadId = `gallery-${Date.now()}-${filename}`;
      addDownload(downloadId, filename, size);
      try {
        const result = await api.pullFile(serial!, remote, local, size, downloadId);
        completeDownload(downloadId);
        return result;
      } catch (err) {
        failDownload(downloadId, String(err));
        throw err;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const remote = `${activeFolder.path}${filename}`;
      return api.deleteFile(serial!, remote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", serial] });
    },
  });

  const handleToggleSelect = (name: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleBulkPull = async () => {
    const fileList = files || [];
    for (const name of selectedFiles) {
      const file = fileList.find((f: MediaFile) => f.name === name);
      await pullMutation.mutateAsync({ filename: name, size: file?.size ?? 0 });
    }
    setSelectedFiles(new Set());
  };

  if (!selectedDevice) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Image className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to browse gallery.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gallery</h2>
          <p className="text-muted-foreground">
            Browse photos, videos, and screenshots on {selectedDevice.model}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedFiles.size > 0 && (
            <Button variant="default" size="sm" onClick={handleBulkPull} disabled={pullMutation.isPending}>
              <Download className="size-4 mr-2" /> Pull {selectedFiles.size} files
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="size-4" /> : <Grid3x3 className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex gap-2 flex-wrap">
        {MEDIA_PATHS.map((folder) => {
          const Icon = folder.icon;
          const isActive = activeFolder.path === folder.path;
          return (
            <Button
              key={folder.path}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveFolder(folder);
                setSelectedFiles(new Set());
              }}
            >
              <Icon className="size-4 mr-1.5" /> {folder.label}
            </Button>
          );
        })}
      </div>

      {/* Media Content */}
      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-3" />
            Loading media...
          </CardContent>
        </Card>
      ) : !files || files.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Image className="size-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">No media files found</p>
            <p className="text-xs mt-1">Folder: {activeFolder.path}</p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <Card className="overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file: MediaFile) => {
                const type = getMediaType(file.name);
                const isSelected = selectedFiles.has(file.name);
                return (
                  <TableRow key={file.name} className={isSelected ? "bg-primary/5" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(file.name)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[300px]" title={file.name}>
                      <div className="flex items-center gap-3">
                        {file.name}
                        {(() => {
                          const activeDownload = downloads.find(d => d.filename === file.name && d.status === "downloading");
                          if (!activeDownload) return null;
                          return (
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <div className="h-1 bg-muted rounded-full flex-1 overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-300" 
                                  style={{ width: `${activeDownload.percent || 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-primary font-medium">{activeDownload.percent}%</span>
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs gap-1">
                        {type === "image" ? <FileImage className="size-3" /> : <Film className="size-3" />}
                        {type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatSize(file.size)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{file.modified}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => pullMutation.mutate({ filename: file.name, size: file.size })}
                        disabled={pullMutation.isPending}
                      >
                        <Download className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${file.name}?`)) {
                            deleteMutation.mutate(file.name);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {files.map((file: MediaFile) => {
            const type = getMediaType(file.name);
            const isSelected = selectedFiles.has(file.name);
            return (
              <Card
                key={file.name}
                className={`cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => handleToggleSelect(file.name)}
              >
                <CardContent className="p-3">
                  <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center mb-2 overflow-hidden relative">
                    {type === "image" ? (
                      <FileImage className="size-10 text-blue-400" />
                    ) : (
                      <Film className="size-10 text-purple-400" />
                    )}
                    
                    {/* Grid View Progress Overlay */}
                    {(() => {
                      const activeDownload = downloads.find(d => d.filename === file.name && d.status === "downloading");
                      if (!activeDownload) return null;
                      return (
                        <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                            <div 
                              className="h-full bg-primary transition-all duration-300" 
                              style={{ width: `${activeDownload.percent || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-primary">{activeDownload.percent}%</span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-xs font-mono truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {files && files.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {files.length} files · {files.filter((f: MediaFile) => getMediaType(f.name) === "image").length} photos · {files.filter((f: MediaFile) => getMediaType(f.name) === "video").length} videos
        </div>
      )}
    </div>
  );
}
