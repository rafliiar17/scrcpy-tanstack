import { useState } from "react";
import { Wifi, Plug, RefreshCw, AlertCircle } from "lucide-react";
import { useSystem } from "@/hooks/use-system";
import { useSelectedDevice } from "@/hooks/use-devices";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function TcpipPage() {
  const { selectedDevice } = useSelectedDevice();
  const { tcpipConnect, isConnecting, tcpipDisconnect, isDisconnecting, enableTcpip, isEnablingTcpip } = useSystem();

  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("5555");
  const [connectMessage, setConnectMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [enableMessage, setEnableMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Wireless ADB (TCP/IP)</h2>
        <p className="text-muted-foreground">
          Manage wireless connections to your Android devices over the local network.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connect to Device (Target) */}
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
      </div>
    </div>
  );
}
