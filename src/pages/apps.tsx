import { useState, useMemo } from "react";
import { 
  Package, Search, Download, Trash2, 
  PowerOff, Database, Play, MoreHorizontal, MonitorPlay 
} from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useApps } from "@/hooks/use-apps";
import { open } from "@tauri-apps/plugin-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppsPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;
  
  const { 
    apps, isLoading, refetch,
    installApk, uninstallApp, clearAppData, forceStopApp, launchApp, startVirtualDisplay,
    isInstalling
  } = useApps(serial);

  const [search, setSearch] = useState("");
  const [showSystem, setShowSystem] = useState(false);

  // Filter apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchSearch = app.package.toLowerCase().includes(search.toLowerCase());
      const matchSys = showSystem ? true : !app.is_system;
      return matchSearch && matchSys;
    });
  }, [apps, search, showSystem]);

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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
      <Card className="shadow-sm border-border">
        <CardHeader className="py-4 border-b bg-muted/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="system-apps" 
                checked={showSystem} 
                onCheckedChange={setShowSystem} 
              />
              <Label htmlFor="system-apps" className="text-sm font-medium cursor-pointer">
                Show System Apps
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-0">
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
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                      No packages found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app: any) => (
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
      </Card>
      <div className="text-xs text-muted-foreground text-center">
        {filteredApps.length} packages listed
      </div>
    </div>
  );
}
