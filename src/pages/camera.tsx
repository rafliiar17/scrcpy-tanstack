import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, RefreshCw, Play, Video, CircleDot, Square } from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useMirror, useMirrorStatus, defaultMirrorOptions } from "@/hooks/use-mirror";
import { api } from "@/lib/tauri";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CameraInfo } from "@/lib/config";
import {
  CAMERA_SENSORS,
  CAMERA_RESOLUTIONS,
  CAMERA_FPS,
  CAMERA_BITRATES,
  CAMERA_ROTATIONS,
} from "@/lib/config";

export function CameraPage() {
  const { selectedDevice } = useSelectedDevice();
  const { settings } = useSettings();
  const serial = selectedDevice?.serial;
  const { startMirror, stopMirror, isStarting, isStopping } = useMirror(serial ?? null);
  const { data: status } = useMirrorStatus(serial ?? null);
  const isRunning = status?.running;

  // Camera settings state
  const [facing, setFacing] = useState("auto");
  const [cameraSize, setCameraSize] = useState("auto");
  const [cameraFps, setCameraFps] = useState("60");
  const [cameraBitrate, setCameraBitrate] = useState("auto");
  const [cameraRotation, setCameraRotation] = useState("0");
  const [cameraCodec, setCameraCodec] = useState("h265");
  const [noAudio, setNoAudio] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordFile, setRecordFile] = useState("");

  const { data: cameras, isLoading: camerasLoading, refetch } = useQuery({
    queryKey: ["cameras", serial],
    queryFn: () => api.listCameras({ serial: serial! }),
    enabled: !!serial,
  });

  const buildCameraOpts = () => {
    const bitrateNum = cameraBitrate === "auto" ? 8 : parseInt(cameraBitrate);
    const fpsNum = cameraFps === "auto" ? 0 : parseInt(cameraFps);

    return {
      ...defaultMirrorOptions(serial!),
      video_source: "camera" as const,
      camera_id: selectedCamera ?? undefined,
      camera_facing: facing !== "auto" ? facing : undefined,
      camera_size: cameraSize !== "auto" ? cameraSize : undefined,
      max_fps: fpsNum,
      bitrate: bitrateNum,
      rotation: cameraRotation,
      codec: cameraCodec,
      no_audio: noAudio,
    };
  };

  const handleStartCamera = () => {
    if (!serial) return;
    startMirror({
      ...buildCameraOpts(),
      window_title: `Camera - ${selectedDevice?.model ?? serial}`,
    });
  };

  const handleStartRecord = async () => {
    if (!serial) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${settings.recordingsPath.replace(/\/$/, "")}/camera_rec_${timestamp}.mp4`;
    setRecordFile(filename);
    setIsRecording(true);
    try {
      await startMirror({
        ...buildCameraOpts(),
        window_title: `Recording - ${selectedDevice?.model ?? serial}`,
        custom_args: `--record=${filename}`,
      });
    } catch {
      setIsRecording(false);
    }
  };

  const handleStopRecord = () => {
    stopMirror();
    setIsRecording(false);
  };

  if (!selectedDevice) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Camera className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to access camera.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-8xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Camera Mirror</h2>
          <p className="text-muted-foreground">
            Stream & record device camera via scrcpy (Android 12+)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="size-4 mr-2" /> Refresh Cameras
        </Button>
      </div>

      {/* Camera Discovery */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {camerasLoading ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <RefreshCw className="size-6 animate-spin mx-auto mb-3" />
              Scanning cameras...
            </CardContent>
          </Card>
        ) : cameras && cameras.length > 0 ? (
          cameras.map((cam: CameraInfo) => (
            <Card
              key={cam.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedCamera === cam.id ? "ring-2 ring-primary border-primary" : ""
                }`}
              onClick={() => setSelectedCamera(cam.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="size-4 text-blue-500" />
                  Camera {cam.id}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {cam.facing}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Max Resolution: <span className="text-foreground font-medium">{cam.size}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Camera className="size-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>No cameras detected. Requires Android 12+ and scrcpy v2.1+.</p>
              <p className="text-xs mt-2">Make sure your device supports camera mirroring.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Camera Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="size-5" /> Camera Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-5">
            {/* Sensor / Facing */}
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Sensor</label>
              <Select value={facing} onValueChange={(val) => setFacing(val || "")}>
                <SelectTrigger className="w-full bg-background h-10">
                  <SelectValue placeholder="Select sensor" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_SENSORS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Resolution</label>
              <Select value={cameraSize} onValueChange={(val) => setCameraSize(val || "")}>
                <SelectTrigger className="w-full bg-background h-8 text-xs">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_RESOLUTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frame Rate */}
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Frame Rate</label>
              <Select value={cameraFps} onValueChange={(val) => setCameraFps(val || "")}>
                <SelectTrigger className="w-full bg-background h-8 text-xs">
                  <SelectValue placeholder="Select frame rate" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_FPS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bitrate */}
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Bitrate</label>
              <Select value={cameraBitrate} onValueChange={(val) => setCameraBitrate(val || "")}>
                <SelectTrigger className="w-full bg-background h-8 text-xs">
                  <SelectValue placeholder="Select bitrate" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_BITRATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Rotation</label>
              <Select value={cameraRotation} onValueChange={(val) => setCameraRotation(val || "")}>
                <SelectTrigger className="w-full bg-background h-8 text-xs">
                  <SelectValue placeholder="Select rotation" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_ROTATIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video Codec */}
            <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Video Codec</label>
              <Select value={cameraCodec} onValueChange={(val) => setCameraCodec(val || "h264")}>
                <SelectTrigger className="w-full bg-background h-8 text-xs">
                  <SelectValue placeholder="Select codec" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h264">H.264 (Compatible)</SelectItem>
                  <SelectItem value="h265">H.265 (HEVC)</SelectItem>
                  <SelectItem value="av1">AV1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selected Camera */}
            {/* <div>
              <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Camera ID</label>
              <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
                {selectedCamera ? `Camera ${selectedCamera}` : "Auto (default)"}
              </div>
            </div> */}
          </div>

          {/* Audio Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="cam-audio"
              checked={!noAudio}
              onChange={(e) => setNoAudio(!e.target.checked)}
              className="rounded"
            />
            <label htmlFor="cam-audio" className="text-sm font-medium cursor-pointer">
              Enable audio (device mic)
            </label>
          </div>

          <Separator />

          {/* Actions */}
          <div className="grid gap-3 md:grid-cols-2">
            {isRunning ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={() => stopMirror()}
                disabled={isStopping}
              >
                {isStopping ? (
                  <><RefreshCw className="size-4 mr-2 animate-spin" /> Stopping...</>
                ) : (
                  <><Square className="size-4 mr-2" /> Stop Camera Stream</>
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleStartCamera}
                disabled={isStarting || isRecording}
              >
                {isStarting ? (
                  <><RefreshCw className="size-4 mr-2 animate-spin" /> Starting...</>
                ) : (
                  <><Play className="size-4 mr-2" /> Start Camera Stream</>
                )}
              </Button>
            )}

            {!isRecording ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStartRecord}
                disabled={isStarting}
              >
                <CircleDot className="size-4 mr-2" /> Record to PC
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={handleStopRecord}
                disabled={isStopping}
              >
                <Square className="size-4 mr-2" /> Stop Recording
              </Button>
            )}
          </div>

          {recordFile && !isRecording && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
              <div>
                <span className="font-mono text-xs block mb-0.5">{recordFile}</span>
                <span className="text-muted-foreground text-xs">Saved to application directory</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRecordFile("")}>
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/10 border-dashed">
        <CardContent className="py-6">
          <h3 className="font-semibold mb-2">💡 Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Camera mirroring requires Android 12+ and scrcpy v2.1+</li>
            <li>Click a discovered camera card above to select it by ID</li>
            <li>Or use the <strong>Sensor</strong> dropdown for back/front/external</li>
            <li>Recording saves to your PC via scrcpy's <code>--record</code> flag</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
