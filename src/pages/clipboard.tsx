import { useState, useEffect, useCallback } from "react";
import { Clipboard, Send, History, Trash2, CheckCircle2, AlertCircle, RefreshCcw, Monitor, Laptop, Smartphone, Zap } from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useMirrorStatus } from "@/hooks/use-mirror";
import { api } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ClipboardHistoryItem {
  id: string;
  text: string;
  timestamp: number;
}

export function ClipboardPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;
  const { data: status } = useMirrorStatus(serial);

  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<ClipboardHistoryItem[]>([]);
  const [syncClipboard, setSyncClipboard] = useState(true);
  const [globalSync, setGlobalSync] = useState(false);
  const [pcClipboard, setPcClipboard] = useState<string>("");

  const isSyncActive = (status?.running ?? false) && syncClipboard;
  const isGlobalSyncRunning = globalSync;

  // Load history and settings from localStorage
  useEffect(() => {
    if (serial) {
      const savedHistory = localStorage.getItem(`clipboard-history-${serial}`);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        setHistory([]);
      }

      const savedSync = localStorage.getItem(`mirror-sync-clipboard-${serial}`);
      setSyncClipboard(savedSync !== "false");

      // Check global sync status from backend
      api.getClipboardSyncStatus(serial).then(setGlobalSync);
    }
  }, [serial]);

  // Save history to localStorage
  useEffect(() => {
    if (serial) {
      localStorage.setItem(`clipboard-history-${serial}`, JSON.stringify(history));
    }
  }, [history, serial]);

  // Save sync setting
  useEffect(() => {
    if (serial) {
      localStorage.setItem(`mirror-sync-clipboard-${serial}`, String(syncClipboard));
    }
  }, [syncClipboard, serial]);

  const handleSend = useCallback(async (content: string = text) => {
    if (!serial || !content.trim()) return;

    setIsSending(true);
    try {
      // Use adb shell input text for quick sending
      const escaped = content.replace(/'/g, "'\\''");
      const result = await api.shellRun(serial, `input text '${escaped}'`);

      if (result.exit_code === 0) {
        // Add to history
        const newItem: ClipboardHistoryItem = {
          id: Math.random().toString(36).substring(7),
          text: content,
          timestamp: Date.now(),
        };
        setHistory((prev: ClipboardHistoryItem[]) => [newItem, ...prev.slice(0, 49)]);
        if (content === text) setText("");
      } else {
        throw new Error(result.stderr || "Failed to send text");
      }
    } catch (error) {
      console.error("Clipboard Error:", error);
    } finally {
      setIsSending(false);
    }
  }, [serial, text]);

  // Listen for backend sync events (PC -> Android)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("clipboard-sync-event", (event) => {
        const content = event.payload as string;
        console.log("Sync Event:", content);
        setPcClipboard(content);
      });
    };

    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const clearHistory = () => {
    setHistory([]);
  };

  const toggleGlobalSync = async (enabled: boolean) => {
    if (!serial) return;
    try {
      if (enabled) {
        await api.startClipboardSync(serial);
      } else {
        await api.stopClipboardSync(serial);
      }
      setGlobalSync(enabled);
    } catch (err) {
      console.error("Failed to toggle global sync:", err);
    }
  };

  const copyToLocal = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  if (!serial) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Clipboard className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to manage clipboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clipboard Manager</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground truncate">Sync and manage text between PC and {selectedDevice?.model}</p>
            <Badge variant={isSyncActive || isGlobalSyncRunning ? "default" : "secondary"} className={isSyncActive || isGlobalSyncRunning ? "bg-green-500/15 text-green-500 hover:bg-green-500/20" : "opacity-60"}>
              {isSyncActive || isGlobalSyncRunning ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                  {isSyncActive ? "Mirror Sync Active" : "Background Sync Active"}
                </span>
              ) : (
                "Sync Idle"
              )}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Actions & Settings */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="size-4" />
                Quick Send
              </CardTitle>
              <CardDescription>
                Directly type text into the focused field on your device via ADB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="group relative">
                <Textarea
                  placeholder="Type or paste text to send..."
                  className="min-h-[120px] resize-none font-mono text-sm pr-12"
                  value={text}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Paste from PC"
                  onClick={async () => {
                    const content = await navigator.clipboard.readText();
                    setText(content);
                  }}
                >
                  <RefreshCcw className="size-4" />
                </Button>
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={isSending || !text.trim()}
                className="w-full shadow-sm"
              >
                {isSending ? "Sending..." : (
                  <span className="flex items-center gap-2">
                    <Send className="size-4" />
                    Send to Device
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {pcClipboard && (
            <Card className="shadow-sm border-dashed bg-muted/20">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Monitor className="size-3.5" />
                  Latest on PC
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-4 flex items-center justify-between gap-4">
                <p className="text-xs font-mono truncate flex-1 opacity-70">
                  {pcClipboard}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] px-2"
                  onClick={() => setText(pcClipboard)}
                >
                  Use This
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="size-4 text-blue-500" />
                KDE Connect Style Sync
              </CardTitle>
              <CardDescription>
                Background service monitors PC & Android clipboards automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Always Sync in Background</Label>
                  <p className="text-xs text-muted-foreground">
                    Runs a headless service to monitor and pull Android clipboard.
                  </p>
                </div>
                <Switch 
                  checked={globalSync} 
                  onCheckedChange={toggleGlobalSync} 
                />
              </div>
              {globalSync && (
                <div className="rounded-md border border-blue-200 bg-blue-100/30 p-3 text-[11px] text-blue-700 flex gap-2">
                  <Laptop className="size-3.5 shrink-0" />
                  <RefreshCcw className="size-3.5 shrink-0 animate-spin" />
                  <Smartphone className="size-3.5 shrink-0" />
                  <span>
                    True background sync is active. PC & {selectedDevice?.model} are now linked via Rust listener.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Mirror Sync Settings
              </CardTitle>
              <CardDescription>
                Configure how clipboard behaves during a Mirror session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync Clipboard</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync PC and Device clipboards while mirroring.
                  </p>
                </div>
                <Switch
                  checked={syncClipboard}
                  onCheckedChange={setSyncClipboard}
                />
              </div>
              <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground flex gap-2">
                <AlertCircle className="size-4 shrink-0 text-amber-500" />
                <span>
                  This setting takes effect when you <strong>Start</strong> a Mirror session.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History */}
        <Card className="shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="size-4" />
                History
              </CardTitle>
              <CardDescription>Recent items sent to device.</CardDescription>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearHistory} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <History className="size-8 opacity-20 mb-2" />
                <p className="text-sm">No clipboard history yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {history.map((item: ClipboardHistoryItem, index: number) => (
                    <div key={item.id} className="group relative">
                      <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => copyToLocal(item.text)}
                            >
                              Copy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary"
                              onClick={() => handleSend(item.text)}
                            >
                              Resend
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-mono break-all line-clamp-3">
                          {item.text}
                        </p>
                      </div>
                      {index < history.length - 1 && <Separator className="mt-4 opacity-50" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
