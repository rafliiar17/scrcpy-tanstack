import { useState, useEffect, useRef } from "react";
import { Play, Square, MonitorPlay, TerminalSquare } from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useMirror, useMirrorStatus, defaultMirrorOptions } from "@/hooks/use-mirror";
import type { MirrorOptions } from "@/lib/config";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function MirrorPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;
  const { data: status } = useMirrorStatus(serial);
  const { startMirror, stopMirror, logs, buildCommand, isStarting, isStopping } = useMirror(serial);

  const [options, setOptions] = useState<MirrorOptions | null>(null);
  const [cmdPreview, setCmdPreview] = useState<string>("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize options when device changes
  useEffect(() => {
    if (serial) {
      setOptions(defaultMirrorOptions(serial));
    } else {
      setOptions(null);
    }
  }, [serial]);

  // Update command preview
  useEffect(() => {
    if (options && serial) {
      buildCommand(options).then((args) => setCmdPreview(args.join(" ")));
    }
  }, [options, serial, buildCommand]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleStart = () => {
    if (options) startMirror(options);
  };

  const handleStop = () => {
    stopMirror();
  };

  const updateOption = <K extends keyof MirrorOptions>(key: K, value: MirrorOptions[K]) => {
    setOptions((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  if (!serial || !options) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <MonitorPlay className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device from the sidebar to start mirroring.</p>
      </div>
    );
  }

  const isRunning = status?.running ?? false;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Screen Mirror</h2>
          <p className="text-muted-foreground">Configure and launch Scrcpy for {selectedDevice?.model}</p>
        </div>
        <div className="flex items-center gap-3">
          {isRunning ? (
            <Button variant="destructive" size="lg" onClick={handleStop} disabled={isStopping} className="w-32">
              <Square className="mr-2 size-4" />
              Stop
            </Button>
          ) : (
            <Button size="lg" onClick={handleStart} disabled={isStarting} className="w-32 shadow-sm">
              <Play className="mr-2 size-4" />
              Start
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Col: Settings */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Video Quality</CardTitle>
              <CardDescription>Adjust the streaming resolution, bitrate, and framerate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Max Resolution</Label>
                  <Select value={options.resolution} onValueChange={(v: string | null) => v && updateOption("resolution", v)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Original (Default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Original (Default)</SelectItem>
                      <SelectItem value="1920">1080p (1920)</SelectItem>
                      <SelectItem value="1280">720p (1280)</SelectItem>
                      <SelectItem value="960">540p (960)</SelectItem>
                      <SelectItem value="640">360p (640)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Video Codec</Label>
                  <Select value={options.codec} onValueChange={(v: string | null) => v && updateOption("codec", v)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h264">H.264 (Most Compatible)</SelectItem>
                      <SelectItem value="h265">H.265 (HEVC - Better Quality)</SelectItem>
                      <SelectItem value="av1">AV1 (Efficient, Newer Devices)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Video Bitrate ({options.bitrate} Mbps)</Label>
                </div>
                <Slider
                  min={1}
                  max={64}
                  step={1}
                  value={[options.bitrate]}
                  onValueChange={(v: number | readonly number[]) => updateOption("bitrate", typeof v === "number" ? v : v[0])}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Max Framerate ({options.max_fps === 0 ? "Unlimited" : `${options.max_fps} FPS`})</Label>
                </div>
                <Slider
                  min={0}
                  max={144}
                  step={5}
                  value={[options.max_fps]}
                  onValueChange={(v: number | readonly number[]) => updateOption("max_fps", typeof v === "number" ? v : v[0])}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Additional Arguments</CardTitle>
              <CardDescription>Advanced Scrcpy CLI arguments</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. --crop=1080:1920:0:0 --rotation=1"
                value={options.custom_args}
                onChange={(e) => updateOption("custom_args", e.target.value)}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Toggles & Options */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Behavior & Display</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audio Routing</Label>
                  <p className="text-xs text-muted-foreground">Forward device audio to PC</p>
                </div>
                <Switch checked={!options.no_audio} onCheckedChange={(v: boolean) => updateOption("no_audio", !v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Turn Screen Off</Label>
                  <p className="text-xs text-muted-foreground">Keep physical screen dark</p>
                </div>
                <Switch checked={options.turn_screen_off} onCheckedChange={(v: boolean) => updateOption("turn_screen_off", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Stay Awake</Label>
                  <p className="text-xs text-muted-foreground">Prevent device from sleeping</p>
                </div>
                <Switch checked={options.stay_awake} onCheckedChange={(v: boolean) => updateOption("stay_awake", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Read Only</Label>
                  <p className="text-xs text-muted-foreground">Disable mouse/keyboard input</p>
                </div>
                <Switch checked={options.no_control} onCheckedChange={(v: boolean) => updateOption("no_control", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Always on Top</Label>
                  <p className="text-xs text-muted-foreground">Keep window above others</p>
                </div>
                <Switch checked={options.always_on_top} onCheckedChange={(v: boolean) => updateOption("always_on_top", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Borderless Window</Label>
                  <p className="text-xs text-muted-foreground">Remove window decorations</p>
                </div>
                <Switch checked={options.borderless} onCheckedChange={(v: boolean) => updateOption("borderless", v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Fullscreen</Label>
                  <p className="text-xs text-muted-foreground">Start in fullscreen mode</p>
                </div>
                <Switch checked={options.fullscreen} onCheckedChange={(v: boolean) => updateOption("fullscreen", v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 shadow-sm border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TerminalSquare className="size-4" />
                Command Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-background border p-3">
                <code className="text-xs text-muted-foreground break-all">{cmdPreview || "Loading..."}</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
