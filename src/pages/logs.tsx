import { useState, useRef, useEffect } from "react";
import { Terminal, Play, Square, Trash2, Download } from "lucide-react";
import { useSystem } from "@/hooks/use-system";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useTauriEvent } from "@/hooks/use-tauri-event";
import { api } from "@/lib/tauri";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LogsPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;
  const { startLogcat, stopLogcat } = useSystem();

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [appLogs, setAppLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState("android");

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to log events
  useTauriEvent<string>(`logcat-${serial}`, (payload) => {
    setLogs((prev) => {
      const next = [...prev, payload];
      if (next.length > 5000) return next.slice(next.length - 5000);
      return next;
    });
  });

  useTauriEvent<string>("log", (payload) => {
    setAppLogs((prev) => {
      const next = [...prev, payload];
      if (next.length > 5000) return next.slice(next.length - 5000);
      return next;
    });
  });

  // Handle device switch - Only reset Android logs, keep App logs
  useEffect(() => {
    setLogs([]);
    setIsRunning(false);
  }, [serial]);

  // Initial fetch of app logs
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await api.getAppLogs();
        setAppLogs(history);
      } catch (err) {
        console.error("Failed to fetch app logs history", err);
      }
    };
    fetchHistory();
  }, []);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView();
    }
  }, [logs, autoScroll]);

  // Handle manual scrolling to toggle auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const toggleLogcat = async () => {
    if (!serial) return;
    if (isRunning) {
      await stopLogcat(serial);
      setIsRunning(false);
    } else {
      await startLogcat(serial);
      setIsRunning(true);
    }
  };

  const exportLogs = async () => {
    try {
      const activeLogs = activeTab === "android" ? logs : appLogs;
      const prefix = activeTab === "android" ? "logcat" : "app_logs";
      const defaultName = `${prefix}_${serial || "global"}_${format(new Date(), "yyyyMMdd_HHmmss")}.txt`;
      const path = await save({ defaultPath: defaultName });
      if (path) {
        await writeTextFile(path, activeLogs.join("\n"));
      }
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const filteredLogs = logs.filter(log => 
    !filter || log.toLowerCase().includes(filter.toLowerCase())
  );
  
  const filteredAppLogs = appLogs.filter(log => 
    !filter || log.toLowerCase().includes(filter.toLowerCase())
  );

  if (!serial) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Terminal className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to view logcat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Logcat Monitor</h2>
          <p className="text-muted-foreground">
            {activeTab === "android" ? `Streaming real-time logs from ${selectedDevice?.model}` : "Desktop App internal console output"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64 h-9"
          />
          {activeTab === "android" && (
            <Button 
              variant={isRunning ? "destructive" : "default"} 
              onClick={toggleLogcat}
            >
              {isRunning ? (
                <><Square className="mr-2 size-4" /> Stop</>
              ) : (
                <><Play className="mr-2 size-4" /> Start</>
              )}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => activeTab === "android" ? setLogs([]) : setAppLogs([])} title="Clear logs">
            <Trash2 className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportLogs} disabled={activeTab === "android" ? logs.length === 0 : appLogs.length === 0} title="Export logs">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-[400px] grid-cols-2 shrink-0 border mb-2">
          <TabsTrigger value="android">Android Logcat</TabsTrigger>
          <TabsTrigger value="app">Desktop App Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="android" className="flex-1 min-h-0 min-w-0 mt-0 data-[state=inactive]:hidden">
          <Card className="h-full overflow-hidden border-border bg-black text-green-400 font-mono text-xs shadow-inner">
            <CardContent className="h-full p-0 relative">
              <div 
                onScroll={handleScroll}
                className="h-full overflow-y-auto p-4 leading-relaxed"
              >
                {filteredLogs.length === 0 ? (
                  <div className="text-muted-foreground text-center mt-10">
                    {isRunning ? "Waiting for logs..." : "Logcat is stopped. Click Start to stream logs."}
                  </div>
                ) : (
                  filteredLogs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all hover:bg-white/5 py-0.5 px-1 rounded-sm">
                      {log}
                    </div>
                  ))
                )}
                <div ref={activeTab === "android" ? logsEndRef : null} className="h-4" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app" className="flex-1 min-h-0 min-w-0 mt-0 data-[state=inactive]:hidden">
          <Card className="h-full overflow-hidden border-border bg-[#0d1117] text-blue-300 font-mono text-xs shadow-inner">
            <CardContent className="h-full p-0 relative">
              <div 
                onScroll={handleScroll}
                className="h-full overflow-y-auto p-4 leading-relaxed"
              >
                {filteredAppLogs.length === 0 ? (
                  <div className="text-muted-foreground text-center mt-10">
                    No application logs recorded yet.
                  </div>
                ) : (
                  filteredAppLogs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all hover:bg-white/5 py-0.5 px-1 rounded-sm">
                      {log}
                    </div>
                  ))
                )}
                <div ref={activeTab === "app" ? logsEndRef : null} className="h-4" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!autoScroll && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <Button 
              variant="secondary" 
              size="sm" 
              className="rounded-full shadow-lg opacity-90 border"
              onClick={() => setAutoScroll(true)}
            >
              Resume Auto-scroll
            </Button>
          </div>
        )}
      </Tabs>
    </div>
  );
}
