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

      <div className="grid gap-6 md:grid-cols-2 auto-rows-fr">
        {/* Connect to Device */}
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
                <div className={`p-4 rounded-xl text-sm border animate-in fade-in slide-in-from-top-1 duration-300 ${connectMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                  <div className="flex items-center gap-2">
                    {connectMessage.type === 'success' ? <Zap className="size-4" /> : <AlertCircle className="size-4" />}
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

        {/* Enable TCP/IP on USB Device */}
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
                 Please select a device from the sidebar first.
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
              <div className={`p-4 rounded-xl text-sm border animate-in fade-in slide-in-from-top-1 duration-300 ${enableMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                 <div className="flex items-center gap-2">
                  {enableMessage.type === 'success' ? <Zap className="size-4" /> : <AlertCircle className="size-4" />}
                  {enableMessage.text}
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              This will restart the ADB daemon on port 5555. Afterward, you can unplug the cable and connect via WiFi.
            </p>
          </CardContent>
          <CardFooter className="flex gap-3 pt-2">
             <Button 
                variant="default" 
                onClick={handleEnableTcpip} 
                disabled={!selectedDevice || isEnablingTcpip || selectedDevice.connection_type === 'wifi'} 
                className="flex-1 h-11 text-base font-medium shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98]"
             >
                {isEnablingTcpip ? (
                  <RefreshCw className="mr-2 size-5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-5" />
                )}
                {isEnablingTcpip ? "Enabling..." : "Restart in TCP Mode"}
             </Button>

             {selectedDevice && selectedDevice.connection_type === 'wifi' && (
               <Button 
                 variant="destructive" 
                 onClick={handleDisconnect} 
                 disabled={isDisconnecting}
                 className="h-11 px-6 shadow-lg shadow-destructive/10 hover:shadow-destructive/20 active:scale-[0.98] transition-all"
               >
                 Disconnect
               </Button>
             )}
          </CardFooter>
        </Card>

        {/* Pair Device (Android 11+) */}
        <Card className="flex flex-col border-blue-500/20 bg-blue-500/[0.02]">
          <form onSubmit={handlePair} className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <QrCode className="size-5" />
                </div>
                Pair Device
                <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Android 11+</span>
              </CardTitle>
              <CardDescription>
                Pair using the code from Wireless debugging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP Address</label>
                  <Input 
                    placeholder="192.168.1.5" 
                    value={pairIp}
                    onChange={(e) => setPairIp(e.target.value)}
                    className="bg-blue-500/5 focus-visible:bg-background border-blue-500/10 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2 w-28">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Port</label>
                  <Input 
                    placeholder="37015" 
                    value={pairPort}
                    onChange={(e) => setPairPort(e.target.value)}
                    className="bg-blue-500/5 focus-visible:bg-background border-blue-500/10 transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center block">Pairing Code</label>
                <Input 
                  placeholder="000000" 
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  className="font-mono text-center tracking-[0.5em] text-2xl h-14 bg-blue-500/5 border-blue-500/10 focus-visible:bg-background transition-colors"
                  maxLength={6}
                  required
                />
              </div>

              {pairMessage && (
                <div className={`p-4 rounded-xl text-sm border animate-in fade-in slide-in-from-top-1 duration-300 ${pairMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                  <div className="flex items-center gap-2">
                    {pairMessage.type === 'success' ? <Zap className="size-4" /> : <AlertCircle className="size-4" />}
                    {pairMessage.text}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" disabled={isPairing || !pairIp || !pairPort || !pairCode} className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20" variant="default">
                {isPairing ? (
                  <RefreshCw className="mr-2 size-5 animate-spin" />
                ) : (
                  <QrCode className="mr-2 size-5" />
                )}
                {isPairing ? "Pairing..." : "Pair Device"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* mDNS Discovery */}
        <Card className="flex flex-col border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Radar className="size-5" />
              </div>
              Discover Devices
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">mDNS</span>
            </CardTitle>
            <CardDescription>
              Scan local network for devices via mDNS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {discoveredDevices.length > 0 ? (
              <div className="space-y-2">
                {discoveredDevices.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-emerald-500/5 hover:bg-emerald-500/10 transition-all border-emerald-500/10 group">
                    <div>
                      <p className="text-sm font-semibold">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded inline-block mt-1">{d.address}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleQuickConnect(d.address)}
                      disabled={isConnecting}
                      className="border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all group-hover:scale-105"
                    >
                      <Zap className="size-3 mr-1" /> Connect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm opacity-60">
                <div className="p-4 rounded-full bg-emerald-500/5 mb-4">
                  <Radar className="size-10 animate-pulse duration-[3000ms]" />
                </div>
                <p>No devices discovered yet</p>
                <p className="text-xs">Click scan to find local ADB services</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Button onClick={handleDiscover} disabled={isDiscovering} className="w-full h-11 text-base font-medium border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-600 transition-all" variant="outline">
              {isDiscovering ? (
                <RefreshCw className="mr-2 size-5 animate-spin" />
              ) : (
                <Radar className="mr-2 size-5" />
              )}
              {isDiscovering ? "Scanning..." : "Scan Network"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
