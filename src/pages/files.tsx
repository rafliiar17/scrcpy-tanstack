import { useState, useMemo } from "react";
import { 
  Folder, File as FileIcon, Upload, Download, Trash2, 
  MoreHorizontal, Plus, HardDrive, CornerLeftUp
} from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useFiles } from "@/hooks/use-files";
import { useDownloads } from "@/components/download-provider";
import { open } from "@tauri-apps/plugin-dialog";
import { formatBytes } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, 
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function FilesPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;
  
  const [currentPath, setCurrentPath] = useState("/sdcard/");
  const [search, setSearch] = useState("");
  
  // Dialog States
  const [isMkdirOpen, setIsMkdirOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [fileToDelete, setFileToDelete] = useState<{name: string, is_dir: boolean} | null>(null);

  const { 
    files, isLoading, refetch,
    pullFile, pushFile, deleteFile, createDirectory,
    isPulling, isPushing, isCreatingDir
  } = useFiles(serial, currentPath);

  // Filter files
  const filteredFiles = useMemo(() => {
    return files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  }, [files, search]);

  const pathParts = useMemo(() => {
    return currentPath.split("/").filter(Boolean);
  }, [currentPath]);

  const navigateTo = (idx: number) => {
    if (idx === -1) {
      setCurrentPath("/");
    } else {
      setCurrentPath("/" + pathParts.slice(0, idx + 1).join("/") + "/");
    }
  };

  const handleRowClick = (file: { name: string; is_dir: boolean }) => {
    if (file.is_dir) {
      setCurrentPath((prev) => (prev.endsWith("/") ? prev + file.name + "/" : prev + "/" + file.name + "/"));
      setSearch("");
    }
  };

  const handleUpload = async () => {
    try {
      const localPath = await open({
        multiple: false,
        title: "Select file to upload to Android",
      });
      if (localPath && typeof localPath === "string") {
        const fileName = localPath.split(/[/\\]/).pop() || "uploaded_file";
        const remotePath = `${currentPath.endsWith("/") ? currentPath : currentPath + "/"}${fileName}`;
        await pushFile({ local: localPath, remote: remotePath });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const { addDownload, completeDownload, failDownload, downloads } = useDownloads();

  const handleDownload = async (file: { name: string; size?: number }) => {
    try {
      const remotePath = `${currentPath.endsWith("/") ? currentPath : currentPath + "/"}${file.name}`;
      const localPath = `~/Downloads/${file.name}`;
      
      const downloadId = `files-${Date.now()}-${file.name}`;
      addDownload(downloadId, file.name, file.size ?? 0);
      try {
        await pullFile({ remote: remotePath, local: localPath, size: file.size ?? 0, downloadId });
        completeDownload(downloadId);
      } catch (err) {
        failDownload(downloadId, String(err));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    try {
      const remotePath = `${currentPath.endsWith("/") ? currentPath : currentPath + "/"}${fileToDelete.name}`;
      await deleteFile(remotePath);
    } catch (err) {
      console.error(err);
    } finally {
      setFileToDelete(null);
    }
  };

  const handleMkdir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const remotePath = `${currentPath.endsWith("/") ? currentPath : currentPath + "/"}${newFolderName.trim()}`;
      await createDirectory(remotePath);
      setIsMkdirOpen(false);
      setNewFolderName("");
    } catch (err) {
      console.error(err);
    }
  };

  if (!serial) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <HardDrive className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to browse its files.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">File Browser</h2>
          <p className="text-muted-foreground truncate max-w-[400px]">
            {currentPath}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsMkdirOpen(true)} disabled={isCreatingDir}>
            <Plus className="mr-2 size-4" />
            New Folder
          </Button>
          <Button onClick={handleUpload} disabled={isPushing}>
            <Upload className="mr-2 size-4" />
            {isPushing ? "Uploading..." : "Upload File"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading} className="ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? "animate-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        {/* Toolbar & Breadcrumbs */}
        <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
          <div className="flex-1 flex items-center justify-start overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => navigateTo(-1)}
                  >
                    <HardDrive className="size-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {pathParts.map((part, idx) => (
                  <React.Fragment key={idx}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {idx === pathParts.length - 1 ? (
                         <BreadcrumbPage>{part}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink className="cursor-pointer" onClick={() => navigateTo(idx)}>
                           {part}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-4 w-64 shrink-0">
            <Input
              placeholder="Filter current folder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
        </CardHeader>

        {/* File Table */}
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="w-[300px] sm:w-[500px] pl-6">Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="hidden sm:table-cell">Modified</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pathParts.length > 0 && search === "" && (
                <TableRow 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigateTo(pathParts.length - 2)}
                >
                  <TableCell colSpan={4} className="pl-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CornerLeftUp className="size-4" />
                      ..
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {isLoading && files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Loading directory contents...
                  </TableCell>
                </TableRow>
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Directory is empty
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file) => (
                  <TableRow 
                    key={file.name} 
                    className={`group transition-colors hover:bg-muted/50 ${file.is_dir ? "cursor-pointer" : ""}`}
                    onClick={() => handleRowClick(file)}
                  >
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        {file.is_dir ? (
                          <Folder className="size-5 text-blue-500 fill-blue-500/20" />
                        ) : (
                          <FileIcon className="size-5 text-muted-foreground" />
                        )}
                        <span className="truncate max-w-[250px] sm:max-w-[400px]" title={file.name}>
                          {file.name}
                        </span>
                        {/* Inline Progress for active downloads */}
                        {(() => {
                          const activeDownload = downloads.find(d => d.filename === file.name && d.status === "downloading");
                          if (!activeDownload) return null;
                          return (
                            <div className="flex items-center gap-2 ml-2 min-w-[80px]">
                              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-300" 
                                  style={{ width: `${activeDownload.percent || 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-primary">
                                {activeDownload.percent || 0}%
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {file.is_dir ? "--" : formatBytes(file.size)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {file.modified}
                    </TableCell>
                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger 
                          render={
                            <Button variant="ghost" className="size-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                          }
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {!file.is_dir && (
                             <DropdownMenuItem onClick={() => handleDownload(file)} disabled={isPulling}>
                               <Download className="mr-2 size-4" />
                               Download
                             </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                            onClick={() => setFileToDelete(file)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete 
              <strong className="mx-1 text-foreground">{fileToDelete?.name}</strong> 
              from your device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Folder Dialog */}
      <Dialog open={isMkdirOpen} onOpenChange={setIsMkdirOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder in {currentPath}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMkdir}>
            <div className="grid gap-4 py-4">
              <Input
                id="name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="col-span-3"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!newFolderName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
