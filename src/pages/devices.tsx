import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, Usb, Wifi, RefreshCw, Power, Unplug, CheckCircle2, XCircle, Monitor, Plug, AlertCircle } from "lucide-react";
import { api } from "@/lib/tauri";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useSystem } from "@/hooks/use-system";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QUERY_STALE_TIME } from "@/lib/config";

export function DevicesPage() {
  const { selectedDevice, setSelectedDevice } = useSelectedDevice();
  const { rebootDevice, tcpipConnect, isConnecting, tcpipDisconnect, isDisconnecting, enableTcpip, isEnablingTcpip } = useSystem();

  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("5555");
  const [connectMessage, setConnectMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [enableMessage, setEnableMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: devices, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.listDevices(),
    refetchInterval: QUERY_STALE_TIME.devices,
  });

  const { data: deviceDetails } = useQuery({
    queryKey: ["deviceInfo", selectedDevice?.serial],
    queryFn: () => api.getDeviceInfo(selectedDevice!.serial),
    enabled: !!selectedDevice,
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

  return (
    <div className="space-y-6 max-w-8xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Devices Manager</h2>
          <p className="text-muted-foreground">
            Manage all connected Android devices & wireless connections
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <form onSubmit={handleConnect}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="size-5 text-primary" />
                Connect via WiFi
              </CardTitle>

              <CardDescription>
                Connect to a device that already has ADB TCP/IP enabled.
              </CardDescription>
              <br />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">IP Address</label>
                  <Input
                    placeholder="192.168.1.5"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 w-24">
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    placeholder="5555"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
              </div>
              {connectMessage && (
                <div className={`p-3 rounded-md text-sm border ${connectMessage.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                  {connectMessage.text}
                </div>
              )}
            </CardContent>
            <br />
            <br />
            <CardFooter>
              <Button type="submit" disabled={isConnecting || !ipAddress} className="w-full">
                {isConnecting ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Wifi className="mr-2 size-4" />
                )}
                {isConnecting ? "Connecting..." : "Connect Device"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="size-5 text-muted-foreground" />
              Enable TCP/IP
            </CardTitle>
            <CardDescription>
              Switch a USB-connected device into Wireless mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDevice ? (
              <div className="flex items-center gap-2 p-3 rounded-md text-sm bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                <AlertCircle className="size-4 shrink-0" />
                Select a device first.
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted text-sm border">
                Device: <strong className="font-mono ml-2">{selectedDevice.model}</strong>
                <br />
                Serial: <span className="font-mono text-muted-foreground ml-2">{selectedDevice.serial}</span>
                <br />
                Type: <span className="uppercase text-xs ml-2 font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">{selectedDevice.connection_type}</span>
              </div>
            )}
            {enableMessage && (
              <div className={`p-3 rounded-md text-sm border ${enableMessage.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                {enableMessage.text}
              </div>
            )}
          </CardContent>
          <br />
          <CardFooter className="flex gap-2">
            <Button
              variant="default"
              onClick={handleEnableTcpip}
              disabled={!selectedDevice || isEnablingTcpip || selectedDevice?.connection_type === "wifi"}
              className="flex-1"
            >
              {isEnablingTcpip ? "Enabling..." : "Restart in TCP Mode"}
            </Button>
            {selectedDevice && selectedDevice.connection_type === "wifi" && (
              <Button
                variant="destructive"
                onClick={() => handleDisconnect(selectedDevice.serial)}
                disabled={isDisconnecting}
              >
                Disconnect
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Active Device Info */}
      {selectedDevice && deviceDetails && (
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

      {/* Devices Table */}
      <Card className="shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-2" />
                  Scanning for devices...
                </TableCell>
              </TableRow>
            ) : devices && devices.length > 0 ? (
              devices.map((device) => {
                const isSelected = selectedDevice?.serial === device.serial;
                const isWifi = device.connection_type === "wifi";
                return (
                  <TableRow key={device.serial} className={isSelected ? "bg-primary/5" : ""}>
                    <TableCell>
                      {isSelected ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{device.serial}</TableCell>
                    <TableCell className="font-medium">{device.model.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant={isWifi ? "secondary" : "outline"} className="gap-1">
                        {isWifi ? <Wifi className="size-3" /> : <Usb className="size-3" />}
                        {isWifi ? "Wi-Fi" : "USB"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={device.status === "device" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {device.status === "device" ? "Online" : device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {!isSelected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelect(device.serial)}
                        >
                          <Monitor className="size-3 mr-1" /> Select
                        </Button>
                      )}
                      {isWifi && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(device.serial)}
                        >
                          <Unplug className="size-3 mr-1" /> Disconnect
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rebootDevice({ serial: device.serial, mode: "" })}
                      >
                        <Power className="size-3 mr-1" /> Reboot
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Smartphone className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No devices detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect a device via USB or wireless ADB
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
