import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, Usb, Wifi, RefreshCw, Power, Unplug, CheckCircle2, Plug, AlertCircle, HelpCircle } from "lucide-react";
import { ConnectionWizard } from "@/components/devices/connection-wizard";
import { api } from "@/lib/tauri";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useSystem } from "@/hooks/use-system";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QUERY_STALE_TIME } from "@/lib/config";

export function DevicesPage() {
  const { selectedDevice, setSelectedDevice } = useSelectedDevice();
  const { rebootDevice, tcpipConnect, isConnecting, tcpipDisconnect, isDisconnecting, enableTcpip, isEnablingTcpip } = useSystem();

  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("5555");
  const [connectMessage, setConnectMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [enableMessage, setEnableMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data: devices, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.listDevices(),
    refetchInterval: QUERY_STALE_TIME.devices,
  });

  const { data: deviceDetails, error: deviceError } = useQuery({
    queryKey: ["deviceInfo", selectedDevice?.serial],
    queryFn: () => api.getDeviceInfo(selectedDevice!.serial),
    enabled: !!selectedDevice && selectedDevice.status === "device",
    retry: false,
  });

  const handleSelect = (serial: string) => {
    const device = devices?.find((d) => d.serial === serial);
    if (device) setSelectedDevice(device);
  };

  const handleDisconnect = async (serial: string) => {
    try {
      await tcpipDisconnect(serial);
      refetch();
    } catch {
      // Ignore
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress) return;
    setConnectMessage(null);
    try {
      const res = await tcpipConnect({ ip: ipAddress, port });
      setConnectMessage({ type: "success", text: res });
      refetch();
    } catch (err: any) {
      setConnectMessage({ type: "error", text: err.toString() });
    }
  };

  const handleEnableTcpip = async () => {
    if (!selectedDevice) return;
    setEnableMessage(null);
    try {
      const res = await enableTcpip(selectedDevice.serial);
      setEnableMessage({ type: "success", text: res });
    } catch (err: any) {
      setEnableMessage({ type: "error", text: err.toString() });
    }
  };

  const handleOpenWizard = () => {
    setIsWizardOpen(true);
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Devices Manager</h2>
          <p className="text-muted-foreground">
            Manage all connected Android devices & wireless connections
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenWizard} className="h-8 gap-1.5 text-[11px] font-bold uppercase tracking-wider">
               <HelpCircle className="size-3.5" />
               Setup ADB
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`size-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
        </div>
      </div>
      
      <ConnectionWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onSuccess={() => refetch()} />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Smartphone className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{devices?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Devices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Usb className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {devices?.filter((d) => d.connection_type === "usb").length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">USB Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Wifi className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {devices?.filter((d) => d.connection_type === "wifi").length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Wireless</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TCP/IP Connection Section */}
      <div className="grid gap-6 md:grid-cols-2 auto-rows-fr">
        <Card className="flex flex-col">
          <form onSubmit={handleConnect} className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wifi className="size-5 text-primary" />
                </div>
                Connect via WiFi
              </CardTitle>
              <CardDescription>
                Connect to a device that already has ADB TCP/IP enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP Address</label>
                  <Input
                    placeholder="192.168.1.5"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="bg-muted/50 focus-visible:bg-background transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2 w-28">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Port</label>
                  <Input
                    placeholder="5555"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="bg-muted/50 focus-visible:bg-background transition-colors"
                  />
                </div>
              </div>
              {connectMessage && (
                <div className={`p-4 rounded-xl text-sm border animate-in fade-in slide-in-from-top-1 duration-300 ${connectMessage.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                  <div className="flex items-center gap-2">
                    {connectMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                    {connectMessage.text}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" disabled={isConnecting || !ipAddress} className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]">
                {isConnecting ? (
                  <RefreshCw className="mr-2 size-5 animate-spin" />
                ) : (
                  <Wifi className="mr-2 size-5" />
                )}
                {isConnecting ? "Connecting..." : "Connect Device"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Plug className="size-5 text-orange-500" />
              </div>
              Enable TCP/IP
            </CardTitle>
            <CardDescription>
              Switch a USB-connected device into Wireless mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {!selectedDevice ? (
              <div className="flex items-center gap-3 p-4 rounded-xl text-sm bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 animate-pulse">
                <AlertCircle className="size-5 shrink-0" />
                Select a device from the table first.
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/40 text-sm border border-border/50 space-y-2 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Model</span>
                  <strong className="font-mono text-foreground">{selectedDevice.model}</strong>
                </div>
                <div className="flex justify-between items-center border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">Serial</span>
                  <span className="font-mono text-foreground">{selectedDevice.serial}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">Connection</span>
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">{selectedDevice.connection_type}</span>
                </div>
              </div>
            )}
            {enableMessage && (
              <div className={`p-4 rounded-xl text-sm border animate-in fade-in slide-in-from-top-1 duration-300 ${enableMessage.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                <div className="flex items-center gap-2">
                  {enableMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                  {enableMessage.text}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              This will restart the ADB daemon on port 5555 of the selected USB device.
            </p>
          </CardContent>
          <CardFooter className="flex gap-3 pt-2">
            <Button
              variant="default"
              onClick={handleEnableTcpip}
              disabled={!selectedDevice || isEnablingTcpip || selectedDevice?.connection_type === "wifi"}
              className="flex-1 h-11 text-base font-medium shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isEnablingTcpip ? (
                 <RefreshCw className="mr-2 size-5 animate-spin" />
              ) : (
                 <RefreshCw className="mr-2 size-5" />
              )}
              {isEnablingTcpip ? "Enabling..." : "Restart in TCP Mode"}
            </Button>
            {selectedDevice && selectedDevice.connection_type === "wifi" && (
              <Button
                variant="destructive"
                onClick={() => handleDisconnect(selectedDevice.serial)}
                disabled={isDisconnecting}
                className="h-11 px-6 shadow-lg shadow-destructive/10 hover:shadow-destructive/20 active:scale-[0.98] transition-all"
              >
                Disconnect
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Active Device Info */}
      {selectedDevice && selectedDevice.status === "device" && deviceDetails && (
        <Card className="shadow-sm border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-green-500" />
              Active Device: <span className="text-primary">{deviceDetails.model}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Manufacturer</span>
                <span className="font-medium">{deviceDetails.manufacturer}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Android</span>
                <span className="font-medium">{deviceDetails.android_version}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Resolution</span>
                <span className="font-medium">{deviceDetails.resolution}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Battery</span>
                <span className="font-medium">{deviceDetails.battery}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unauthorized State Help Card */}
      {selectedDevice && (selectedDevice.status === "unauthorized" || deviceError) && (
        <Card className="shadow-sm border-yellow-500/50 bg-yellow-500/5 transition-all animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="size-5" />
              ADB Authorization Required
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Device <span className="font-mono text-foreground font-bold">{selectedDevice.serial}</span> is connected but not yet authorized by Android.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 rounded-xl bg-background/50 border border-border/50 text-center space-y-2">
                <div className="size-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">1</div>
                <p className="text-xs font-semibold">Check Phone Screen</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Look for the "Allow USB Debugging?" prompt now.</p>
              </div>
              <div className="p-3 rounded-xl bg-background/50 border border-border/50 text-center space-y-2">
                <div className="size-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">2</div>
                <p className="text-xs font-semibold font-bold">Always Allow</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Check "Always allow from this computer" if you want to skip this in future.</p>
              </div>
              <div className="p-3 rounded-xl bg-background/50 border border-border/50 text-center space-y-2">
                <div className="size-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">3</div>
                <p className="text-xs font-semibold uppercase">Grant & Refresh</p>
                <p className="text-[10px] text-muted-foreground leading-tight">After clicking ALLOW on phone, click REFRESH button above.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 py-2.5 px-4 flex justify-between items-center text-[10px] border-t">
              <span className="text-muted-foreground font-medium italic">Still not seeing the prompt? Try unplugging and reconnecting the cable.</span>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold px-2.5 h-6 bg-background" onClick={() => refetch()}>
                <RefreshCw className="mr-1.5 size-3" /> Retry Scan
              </Button>
          </CardFooter>
        </Card>
      )}

      {/* Devices Table */}
      <Card className="shadow-sm overflow-hidden border-border/50">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px] px-2"></TableHead>
              <TableHead className="px-2 py-2">Device Info</TableHead>
              <TableHead className="px-2 py-2">Connection</TableHead>
              <TableHead className="px-2 py-2">Status</TableHead>
              <TableHead className="text-right px-4 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="size-6 animate-spin text-primary/50" />
                    <span className="text-xs font-medium uppercase tracking-wider">Scanning Network...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : devices && devices.length > 0 ? (
              devices.map((device) => {
                const isSelected = selectedDevice?.serial === device.serial;
                const isWifi = device.connection_type === "wifi";
                return (
                  <TableRow key={device.serial} className={cn("group transition-colors", isSelected ? "bg-primary/[0.03] border-l-2 border-l-primary" : "")}>
                    <TableCell className="px-2 py-1.5 text-center">
                      {isSelected ? (
                        <div className="flex items-center justify-center">
                          <CheckCircle2 className="size-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                          <Smartphone className="size-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-tight">{device.model.replace(/_/g, " ")}</span>
                        <span className="font-mono text-[10px] text-muted-foreground opacity-70 uppercase">SN: {device.serial}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant={isWifi ? "secondary" : "outline"} className="h-5 px-1.5 text-[10px] gap-1 font-bold uppercase tracking-tighter">
                        {isWifi ? <Wifi className="size-2.5" /> : <Usb className="size-2.5" />}
                        {isWifi ? "Wi-Fi" : "USB"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                           "size-1.5 rounded-full", 
                           device.status === "device" ? "bg-green-500 animate-pulse" : 
                           device.status === "unauthorized" ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className={cn(
                          "text-[11px] font-medium uppercase tracking-tight",
                          device.status === "device" ? "text-muted-foreground" : 
                          device.status === "unauthorized" ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                        )}>
                          {device.status === "device" ? "Online" : device.status === "unauthorized" ? "Unauthorized" : device.status}
                        </span>
                        {device.status === "unauthorized" && (
                           <AlertCircle className="size-3 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        {!isSelected && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-7 px-3 text-[11px] font-bold uppercase"
                            onClick={() => handleSelect(device.serial)}
                          >
                            Select
                          </Button>
                        )}
                        {isWifi && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDisconnect(device.serial)}
                            disabled={isDisconnecting}
                            title="Disconnect"
                          >
                            <Unplug className="size-3.5" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Power className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                             <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reboot Mode</div>
                             <DropdownMenuItem className="text-xs" onClick={() => rebootDevice({ serial: device.serial, mode: "" })}>
                              System
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => rebootDevice({ serial: device.serial, mode: "recovery" })}>
                              Recovery
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => rebootDevice({ serial: device.serial, mode: "bootloader" })}>
                              Bootloader
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center bg-muted/20">
                  <div className="flex flex-col items-center justify-center gap-2 mt-2">
                    <Smartphone className="size-12 mb-2 text-muted-foreground/30" />
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">No devices detected</p>
                    <p className="text-[11px] font-medium max-w-[240px] text-muted-foreground/50 mb-4">
                      Connect via USB or wireless ADB to start management. Ensure USB Debugging is enabled.
                    </p>
                    
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8 text-[11px] font-bold uppercase tracking-wider"
                      onClick={handleOpenWizard}
                    >
                      <AlertCircle className="mr-2 size-3" />
                      Troubleshoot Connection
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
