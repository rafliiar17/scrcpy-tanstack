import { useState } from "react";
import { Wifi, Plug, RefreshCw, AlertCircle, QrCode, Radar, Zap } from "lucide-react";
import { useSystem } from "@/hooks/use-system";
import { useSelectedDevice } from "@/hooks/use-devices";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function TcpipPage() {
  const { selectedDevice } = useSelectedDevice();
  const {
    tcpipConnect, isConnecting,
    tcpipDisconnect, isDisconnecting,
    enableTcpip, isEnablingTcpip,
    pairDevice, isPairing,
    discoverDevices, isDiscovering, discoveredDevices,
  } = useSystem();

  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("5555");
  const [connectMessage, setConnectMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [enableMessage, setEnableMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pair state
  const [pairIp, setPairIp] = useState("");
  const [pairPort, setPairPort] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [pairMessage, setPairMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress) return;
    setConnectMessage(null);
    try {
      const res = await tcpipConnect({ ip: ipAddress, port });
      setConnectMessage({ type: "success", text: res });
    } catch (err: any) {
      setConnectMessage({ type: "error", text: err.toString() });
    }
  };

  const handleDisconnect = async () => {
    if (!selectedDevice) return;
    try {
      await tcpipDisconnect(selectedDevice.serial);
    } catch (err) {
      console.error("Disconnect failed:", err);
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

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairIp || !pairPort || !pairCode) return;
    setPairMessage(null);
    try {
      const res = await pairDevice({ ip: pairIp, port: pairPort, code: pairCode });
      setPairMessage({ type: "success", text: res });
    } catch (err: any) {
      setPairMessage({ type: "error", text: err.toString() });
    }
  };

  const handleDiscover = async () => {
    try {
      await discoverDevices();
    } catch (err) {
      console.error("Discovery failed:", err);
    }
  };

  const handleQuickConnect = async (address: string) => {
    const [ip, port] = address.split(":");
    setConnectMessage(null);
    try {
      const res = await tcpipConnect({ ip, port: port || "5555" });
      setConnectMessage({ type: "success", text: res });
    } catch (err: any) {
      setConnectMessage({ type: "error", text: err.toString() });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Wireless ADB (TCP/IP)</h2>
        <p className="text-muted-foreground">
          Manage wireless connections to your Android devices over the local network.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connect to Device */}
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
                <div className={`p-3 rounded-md text-sm border ${connectMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                  {connectMessage.text}
                </div>
              )}
            </CardContent>
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

        {/* Pair Device (Android 11+) */}
        <Card className="border-blue-500/20">
          <form onSubmit={handlePair}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-blue-500" />
                Pair Device
                <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-normal">Android 11+</span>
              </CardTitle>
              <CardDescription>
                Pair a new device using the pairing code from Developer Options → Wireless debugging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">IP Address</label>
                  <Input 
                    placeholder="192.168.1.5" 
                    value={pairIp}
                    onChange={(e) => setPairIp(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 w-24">
                  <label className="text-sm font-medium">Port</label>
                  <Input 
                    placeholder="37015" 
                    value={pairPort}
                    onChange={(e) => setPairPort(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Pairing Code</label>
                <Input 
                  placeholder="123456" 
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  className="font-mono text-center tracking-[0.5em] text-lg"
                  maxLength={6}
                  required
                />
              </div>

              {pairMessage && (
                <div className={`p-3 rounded-md text-sm border ${pairMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                  {pairMessage.text}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPairing || !pairIp || !pairPort || !pairCode} className="w-full" variant="default">
                {isPairing ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 size-4" />
                )}
                {isPairing ? "Pairing..." : "Pair Device"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Enable TCP/IP on USB Device */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="size-5 text-muted-foreground" />
              Enable TCP/IP
            </CardTitle>
            <CardDescription>
              Switch a USB-connected device into Wireless mode so you can unplug it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDevice ? (
               <div className="flex items-center gap-2 p-3 rounded-md text-sm bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                 <AlertCircle className="size-4 shrink-0" />
                 Please select a device from the sidebar first.
               </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted text-sm border">
                Current Device: <strong className="font-mono ml-2">{selectedDevice.model}</strong>
                <br/>
                Serial: <span className="font-mono text-muted-foreground ml-2">{selectedDevice.serial}</span>
                <br/>
                Type: <span className="uppercase text-xs ml-2 font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">{selectedDevice.connection_type}</span>
              </div>
            )}

            {enableMessage && (
              <div className={`p-3 rounded-md text-sm border ${enableMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                {enableMessage.text}
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              This will restart the ADB daemon on port 5555. Afterward, you can find the device's IP and connect via WiFi.
            </p>
          </CardContent>
          <CardFooter className="flex gap-2">
             <Button 
                variant="default" 
                onClick={handleEnableTcpip} 
                disabled={!selectedDevice || isEnablingTcpip || selectedDevice.connection_type === 'wifi'} 
                className="flex-1"
             >
                {isEnablingTcpip ? "Enabling..." : "Restart in TCP Mode"}
             </Button>

             {selectedDevice && selectedDevice.connection_type === 'wifi' && (
               <Button 
                 variant="destructive" 
                 onClick={handleDisconnect} 
                 disabled={isDisconnecting}
               >
                 Disconnect
               </Button>
             )}
          </CardFooter>
        </Card>

        {/* mDNS Discovery */}
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-5 text-emerald-500" />
              Discover Devices
              <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-normal">mDNS</span>
            </CardTitle>
            <CardDescription>
              Scan the local network for devices advertising ADB services via mDNS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {discoveredDevices.length > 0 ? (
              <div className="space-y-2">
                {discoveredDevices.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.address}</p>
                      <p className="text-xs text-muted-foreground">{d.service_type}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleQuickConnect(d.address)}
                      disabled={isConnecting}
                    >
                      <Zap className="size-3 mr-1" /> Connect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Radar className="size-8 mx-auto mb-2 opacity-30" />
                No devices discovered yet. Click "Scan Network" to start.
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleDiscover} disabled={isDiscovering} className="w-full" variant="outline">
              {isDiscovering ? (
                <RefreshCw className="mr-2 size-4 animate-spin" />
              ) : (
                <Radar className="mr-2 size-4" />
              )}
              {isDiscovering ? "Scanning..." : "Scan Network"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
