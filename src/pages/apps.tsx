import { useState, useMemo, useEffect } from "react";
import {
  Package, Search, Download, Trash2,
  PowerOff, Database, Play, MoreHorizontal, MonitorPlay,
  Filter, ListOrdered
} from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useApps } from "@/hooks/use-apps";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

export function AppsPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;

  const {
    apps, isLoading, refetch,
    installApk, uninstallApp, clearAppData, forceStopApp, launchApp, startVirtualDisplay,
    isInstalling
  } = useApps(serial);

  const [search, setSearch] = useState("");
  const [appType, setAppType] = useState<"all" | "user" | "system">("user");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(11);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, appType, pageSize]);

  // Filter apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchSearch = app.package.toLowerCase().includes(search.toLowerCase());
      const matchType = appType === "all" ? true :
        appType === "system" ? app.is_system : !app.is_system;
      return matchSearch && matchType;
    });
  }, [apps, search, appType]);

  // Paginate apps
  const totalPages = Math.ceil(filteredApps.length / pageSize);
  const pagedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  const handleInstallClick = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: "Android Package", extensions: ["apk"] }],
      });
      if (file && typeof file === "string") {
        await installApk(file);
      }
    } catch (err) {
      console.error("Install failed:", err);
    }
  };

  if (!serial) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Package className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to manage installed applications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-0 min-w-[90%] mx-auto min-h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Apps Manager</h2>
          <p className="text-muted-foreground">Install, remove, and manage packages on {selectedDevice?.model}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
          <Button onClick={handleInstallClick} disabled={isInstalling}>
            <Download className="mr-2 size-4" />
            {isInstalling ? "Installing..." : "Install APK"}
          </Button>
        </div>
      </div>

      {/* Filters & Table */}
      <Card className="shadow-sm border-border overflow-hidden flex flex-col h-[90%] py-0">
        <CardHeader className="p-0 border-b bg-muted/30 shrink-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1 border-b md:border-b-0 md:border-r border-border p-4">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background h-10 border-none shadow-none focus-visible:ring-0 focus-visible:bg-muted/50 transition-colors"
              />
            </div>

            {/* App Type Filter */}
            <div className="flex items-center gap-2 p-4 border-b md:border-b-0 md:border-r border-border min-w-[200px]">
              <Filter className="size-4 text-muted-foreground mr-1" />
              <Select value={appType} onValueChange={(v: any) => setAppType(v)}>
                <SelectTrigger className="border-none shadow-none focus:ring-0 h-8 font-medium">
                  <SelectValue placeholder="App Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="user">User Apps</SelectItem>
                  <SelectItem value="system">System Apps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page Size */}
            <div className="flex items-center gap-2 p-4 min-w-[150px]">
              <ListOrdered className="size-4 text-muted-foreground mr-1" />
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="border-none shadow-none focus:ring-0 h-8 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="15">15 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto bg-card/50">
          <div className="min-h-[600px] flex flex-col">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow>
                  <TableHead className="w-[450px] pl-6">Package Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <span className="relative flex size-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                          <span className="relative inline-flex rounded-full size-3 bg-primary"></span>
                        </span>
                        Loading packages...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                        <Package className="size-12 mb-2" />
                        <p className="text-sm font-medium">No packages found matching your criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedApps.map((app: any) => (
                    <TableRow key={app.package} className="group transition-colors hover:bg-muted/50">
                      <TableCell className="pl-6 font-mono text-sm max-w-[300px] truncate" title={app.package}>
                        {app.package}
                      </TableCell>
                      <TableCell>
                        {app.is_system ? (
                          <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 font-normal">System</Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-green-500 border-green-500/30">User App</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="size-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                            }
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => launchApp(app.package)}>
                              <Play className="mr-2 size-4" />
                              Launch App
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startVirtualDisplay({ pkg: app.package })}>
                              <MonitorPlay className="mr-2 size-4" />
                              Open in Virtual Display
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => forceStopApp(app.package)}>
                              <PowerOff className="mr-2 size-4" />
                              Force Stop
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => clearAppData(app.package)}>
                              <Database className="mr-2 size-4" />
                              Clear Data
                            </DropdownMenuItem>
                            {!app.is_system && (
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                onClick={() => uninstallApp(app.package)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Uninstall
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {filteredApps.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t bg-muted/20 py-4 gap-4">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Showing <span className="text-foreground">{Math.min(filteredApps.length, (currentPage - 1) * pageSize + 1)}</span> to{" "}
              <span className="text-foreground">{Math.min(filteredApps.length, currentPage * pageSize)}</span> of{" "}
              <span className="text-foreground">{filteredApps.length}</span> packages
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>

                  {/* Simple numeric pages generator (can be improved for many pages) */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    // Center the pages around current page if totalPages > 5
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i + 1;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }

                    if (pageNum > totalPages) return null;

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={currentPage === pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <span className="p-2 text-muted-foreground">...</span>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
