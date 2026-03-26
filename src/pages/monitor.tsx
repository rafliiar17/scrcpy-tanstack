import { useQuery } from "@tanstack/react-query";
import { Cpu, HardDrive, Battery, MemoryStick, Activity, RefreshCw } from "lucide-react";
import { useSystem } from "@/hooks/use-system";
import { useSelectedDevice } from "@/hooks/use-devices";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, Shield, Wifi, Smartphone, Radio } from "lucide-react";

// Regex Parsers
const parseMeminfo = (out: string) => {
  const totalMatch = out.match(/MemTotal:\s+(\d+) kB/);
  const availMatch = out.match(/MemAvailable:\s+(\d+) kB/);

  if (!totalMatch || !availMatch) return null;

  const total = parseInt(totalMatch[1], 10) * 1024;
  const avail = parseInt(availMatch[1], 10) * 1024;
  const used = total - avail;

  return { total, used, avail, percent: Math.round((used / total) * 100) };
};

const parseBattery = (out: string) => {
  const levelMatch = out.match(/level: (\d+)/);
  const tempMatch = out.match(/temperature: (\d+)/);
  const isCharging = out.includes("status: 2");
  const voltageMatch = out.match(/voltage: (\d+)/);
  const healthMatch = out.match(/health: (\d+)/);

  let cycleMatch = out.match(/cycle count: (\d+)/);
  if (!cycleMatch) cycleMatch = out.match(/Charge counter: (\d+)/); // fallback

  let healthStr = "Unknown";
  if (healthMatch) {
    switch (healthMatch[1]) {
      case "2": healthStr = "Good"; break;
      case "3": healthStr = "Overheat"; break;
      case "4": healthStr = "Dead"; break;
      case "5": healthStr = "Over Volt"; break;
      case "7": healthStr = "Cold"; break;
    }
  }

  return {
    level: levelMatch ? parseInt(levelMatch[1], 10) : 0,
    temp: tempMatch ? parseInt(tempMatch[1], 10) / 10 : 0,
    isCharging,
    voltage: voltageMatch ? parseInt(voltageMatch[1], 10) / 1000 : 0,
    health: healthStr,
    cycle: cycleMatch ? cycleMatch[1] : "N/A"
  };
};

const parseStorage = (out: string) => {
  const lines = out.split('\n');
  const dataLine = lines.find(l => l.includes('/data'));
  if (!dataLine) return null;

  const parts = dataLine.trim().split(/\s+/);
  if (parts.length >= 6) {
    // format: Filesystem Size Used Avail Use% Mounted on
    return {
      total: parts[1],
      used: parts[2],
      free: parts[3],
      percent: parseInt(parts[4].replace('%', ''), 10)
    };
  }
  return null;
};

const parseCpu = (out: string) => {
  const hardware = out.match(/Hardware\s+:\s+(.+)/)?.[1] || "Unknown SoC";
  const processor = out.match(/Processor\s+:\s+(.+)/)?.[1] || "";
  const cores = (out.match(/processor\s+:\s+\d+/g) || []).length;

  return { hardware, processor, cores };
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const parseTopTable = (out: string) => {
  const lines = out.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headerIdx = lines.findIndex(l => l.includes('PID') && l.includes('USER'));
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(/\s+/);
  const cpuIdx = headers.findIndex(h => h.includes('CPU'));
  const memIdx = headers.findIndex(h => h.includes('MEM'));

  const processes = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length < 8) continue;

    const cpu = cpuIdx !== -1 ? parts[cpuIdx] : parts[parts.length - 4];
    const mem = memIdx !== -1 ? parts[memIdx] : parts[parts.length - 3];
    const name = parts[parts.length - 1];

    processes.push({
      pid: parts[0],
      user: parts[1],
      cpu: cpu || "0.0",
      mem: mem || "0.0",
      name: name
    });
  }
  return processes.slice(0, 15);
};

export function MonitorPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial;
  const { shellRun } = useSystem();

  // Poll RAM and Battery every 3 seconds
  const { data: memStats, isFetching: memFetching } = useQuery({
    queryKey: ['monitor-mem', serial],
    queryFn: async () => {
      const { stdout } = await shellRun({ serial: serial!, command: "cat /proc/meminfo" });
      return parseMeminfo(stdout);
    },
    enabled: !!serial,
    refetchInterval: 3000,
  });

  const { data: batteryStats } = useQuery({
    queryKey: ['monitor-battery', serial],
    queryFn: async () => {
      const { stdout } = await shellRun({ serial: serial!, command: "dumpsys battery" });
      return parseBattery(stdout);
    },
    enabled: !!serial,
    refetchInterval: 5000,
  });

  // Storage and CPU info changes rarely
  const { data: storageStats } = useQuery({
    queryKey: ['monitor-storage', serial],
    queryFn: async () => {
      const { stdout } = await shellRun({ serial: serial!, command: "df -h /data" });
      return parseStorage(stdout);
    },
    enabled: !!serial,
    refetchInterval: 30000,
  });

  const { data: cpuStats } = useQuery({
    queryKey: ['monitor-cpu', serial],
    queryFn: async () => {
      const { stdout } = await shellRun({ serial: serial!, command: "cat /proc/cpuinfo" });
      return parseCpu(stdout);
    },
    enabled: !!serial,
    staleTime: Infinity,
  });

  const { data: advStats } = useQuery({
    queryKey: ['monitor-advanced', serial],
    queryFn: async () => {
      const { stdout: os } = await shellRun({ serial: serial!, command: "getprop ro.build.version.release" });
      const { stdout: sdk } = await shellRun({ serial: serial!, command: "getprop ro.build.version.sdk" });
      const { stdout: lockedStr } = await shellRun({ serial: serial!, command: "getprop ro.boot.flash.locked" });
      const { stdout: netStr } = await shellRun({ serial: serial!, command: "getprop gsm.network.type" });
      const { stdout: sim } = await shellRun({ serial: serial!, command: "getprop gsm.sim.operator.alpha" });
      const { stdout: imei } = await shellRun({ serial: serial!, command: "service call iphonesubinfo 1" });
      const { stdout: oemUnlock } = await shellRun({ serial: serial!, command: "getprop sys.oem_unlock_allowed" });
      const { stdout: gpuInfo } = await shellRun({ serial: serial!, command: "dumpsys SurfaceFlinger | grep -i GLES | head -n 1" });

      return {
        android: `Android ${os.trim()} (API ${sdk.trim()})`,
        bootloader: lockedStr.trim() === '0' || oemUnlock.trim() === '1' ? 'Unlocked' : 'Locked/Unknown',
        gpu: gpuInfo.trim().replace('GLES: ', '') || 'Adreno/Mali GPU',
        network: netStr.trim() || 'Wi-Fi / Unknown',
        sim: sim.trim() || 'No SIM',
        imei: imei.includes('Result:') || imei.includes('Parcel') ? 'Requires Root' : imei.trim() || 'Hidden',
      };
    },
    enabled: !!serial,
    staleTime: Infinity,
  });

  const { data: topStats, isFetching: topFetching } = useQuery({
    queryKey: ['monitor-top', serial],
    queryFn: async () => {
      const { stdout } = await shellRun({ serial: serial!, command: "top -n 1" });
      return parseTopTable(stdout);
    },
    enabled: !!serial,
    refetchInterval: 3000,
  });

  if (!selectedDevice) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Activity className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to view hardware monitor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-8xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hardware Monitor</h2>
          <p className="text-muted-foreground">
            Live telemetry and system resources from {selectedDevice.model}
          </p>
        </div>
        {memFetching && <RefreshCw className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* RAM Monitor */}
        <Card className="shadow-sm border-border bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MemoryStick className="size-5 text-purple-500" />
              Memory (RAM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold tracking-tighter">
                    {formatBytes(memStats.used)}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    / {formatBytes(memStats.total)}
                  </span>
                </div>
                <Progress value={memStats.percent} className="h-3 my-2" indicatorColor={memStats.percent > 85 ? "bg-red-500" : "bg-purple-500"} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{memStats.percent}% Used</span>
                  <span>{formatBytes(memStats.avail)} Free</span>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Battery Monitor */}
        <Card className="shadow-sm border-border bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Battery className="size-5 text-green-500" />
              Battery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batteryStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold tracking-tighter text-green-500">
                    {batteryStats.level}%
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {batteryStats.isCharging ? "Charging" : "Discharging"}
                  </span>
                </div>
                <Progress value={batteryStats.level} className="h-3 my-2" indicatorColor={batteryStats.level < 20 && !batteryStats.isCharging ? "bg-red-500" : "bg-green-500"} />
                <div className="flex justify-between text-sm">
                  <span className="text-orange-500">{batteryStats.temp.toFixed(1)}°C Temp</span>
                  <span className="text-blue-400">{batteryStats.voltage.toFixed(2)}v Volts</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>Health: <span className="text-foreground">{batteryStats.health}</span></span>
                  <span>Cycles: <span className="text-foreground">{batteryStats.cycle}</span></span>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Storage Monitor */}
        <Card className="shadow-sm border-border bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="size-5 text-blue-500" />
              Internal Storage (/data)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storageStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold tracking-tighter">
                    {storageStats.used}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    / {storageStats.total}
                  </span>
                </div>
                <Progress value={storageStats.percent} className="h-3 my-2" indicatorColor={storageStats.percent > 90 ? "bg-red-500" : "bg-blue-500"} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{storageStats.percent}% Used</span>
                  <span>{storageStats.free} Free</span>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* CPU Monitor */}
        <Card className="shadow-sm border-border bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="size-5 text-orange-500" />
              Processor (SoC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cpuStats ? (
              <div className="space-y-4 flex flex-col justify-center h-[104px]">
                <div className="font-semibold text-lg truncate">
                  {cpuStats.hardware}
                </div>
                <div className="text-muted-foreground text-sm truncate">
                  {cpuStats.processor}
                </div>
                <div className="text-orange-400 font-medium text-sm">
                  {cpuStats.cores} CPU Cores Detected
                </div>
              </div>
            ) : (
              <div className="h-[104px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="size-5 text-blue-400" /> Advanced Specifications
        </h3>
        <Card className="shadow-sm border-border">
          <CardContent className="p-0">
            {advStats ? (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-2 md:grid-cols-3 p-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5"><Smartphone className="size-3.5" /> OS Version</span>
                    <span className="font-medium">{advStats.android}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5"><Shield className="size-3.5" /> Bootloader</span>
                    <span className="font-medium">{advStats.bootloader}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5"><Cpu className="size-3.5" /> GPU Engine</span>
                    <span className="font-medium truncate block" title={advStats.gpu}>{advStats.gpu}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 p-4 gap-4 text-sm bg-muted/10">
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5"><Wifi className="size-3.5" /> Network</span>
                    <span className="font-medium">{advStats.network}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5"><Radio className="size-3.5" /> SIM Card</span>
                    <span className="font-medium">{advStats.sim}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5"><Info className="size-3.5" /> IMEI</span>
                    <span className="font-medium text-xs font-mono">{advStats.imei}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">Loading advanced specs...</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="size-5 text-green-500" /> Active Processes
          {topFetching && <RefreshCw className="size-3 animate-spin text-muted-foreground ml-2" />}
        </h3>
        <Card className="shadow-sm border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[100px]">PID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>CPU %</TableHead>
                <TableHead>MEM %</TableHead>
                <TableHead className="text-right">Process Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStats && topStats.length > 0 ? (
                topStats.map((proc) => (
                  <TableRow key={proc.pid}>
                    <TableCell className="font-mono text-xs">{proc.pid}</TableCell>
                    <TableCell className="text-xs">{proc.user}</TableCell>
                    <TableCell className="text-orange-400 font-medium">{proc.cpu}</TableCell>
                    <TableCell className="text-purple-400 font-medium">{proc.mem}</TableCell>
                    <TableCell className="text-right truncate max-w-[300px] font-mono text-xs" title={proc.name}>
                      {proc.name}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading or unreachable top stream...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
