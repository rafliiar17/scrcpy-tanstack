import { useState } from "react";
import { Radio, Play, Volume2, RefreshCw, Square } from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useMirror, useMirrorStatus, defaultMirrorOptions } from "@/hooks/use-mirror";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LivestreamPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial;
  const { startMirror, stopMirror, isStarting, isStopping } = useMirror(serial ?? null);
  const { data: status } = useMirrorStatus(serial ?? null);
  const isRunning = status?.running;

  const [audioSource, setAudioSource] = useState("output");
  const [audioCodec, setAudioCodec] = useState("opus");
  const [videoCodec, setVideoCodec] = useState("h264");
  const [noVideo, setNoVideo] = useState(false);

  const handleStartAudio = () => {
    if (!serial) return;
    const opts = {
      ...defaultMirrorOptions(serial),
      no_video: noVideo,
      codec: videoCodec,
      no_audio: false,
      audio_source: audioSource,
      audio_codec: audioCodec,
      no_control: true,
      window_title: `Livestream - ${selectedDevice?.model ?? serial}`,
    };
    startMirror(opts);
  };

  if (!selectedDevice) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <Radio className="size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">No Device Selected</h2>
        <p className="text-muted-foreground mt-2">Please select a device to access audio streaming.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audio Stream</h2>
        <p className="text-muted-foreground">
          Forward Android audio to your desktop using scrcpy's native audio pipeline
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="size-5 text-purple-500" />
            Audio Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Audio Source</label>
              <Select value={audioSource} onValueChange={(val) => setAudioSource(val || "")}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Select audio source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="output">Device Output (All Sounds)</SelectItem>
                  <SelectItem value="playback">App Playback (may exclude some apps)</SelectItem>
                  <SelectItem value="mic">Microphone</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                "Output" captures all device audio. "Playback" allows audio to still play on device.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Audio Codec</label>
              <Select value={audioCodec} onValueChange={(val) => setAudioCodec(val || "")}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Select codec" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opus">Opus (Recommended)</SelectItem>
                  <SelectItem value="aac">AAC</SelectItem>
                  <SelectItem value="flac">FLAC (Lossless)</SelectItem>
                  <SelectItem value="raw">Raw PCM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border h-full">
              <input
                type="checkbox"
                id="noVideo"
                checked={noVideo}
                onChange={(e) => setNoVideo(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="noVideo" className="text-sm">
                <span className="font-medium">Audio Only Mode</span>
                <span className="text-muted-foreground block text-xs">
                  Disable video mirroring entirely
                </span>
              </label>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Video Codec</label>
              <Select disabled={noVideo} value={videoCodec} onValueChange={(val) => setVideoCodec(val || "h264")}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Select video codec" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h264">H.264 (Most Compatible)</SelectItem>
                  <SelectItem value="h265">H.265 (HEVC - Better Quality)</SelectItem>
                  <SelectItem value="av1">AV1 (Efficient, Newer Devices)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isRunning ? (
            <Button
              className="w-full"
              size="lg"
              variant="destructive"
              onClick={() => stopMirror()}
              disabled={isStopping}
            >
              {isStopping ? (
                <><RefreshCw className="size-4 mr-2 animate-spin" /> Stopping...</>
              ) : (
                <><Square className="size-4 mr-2" /> Stop Audio Stream</>
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={handleStartAudio}
              disabled={isStarting}
            >
              {isStarting ? (
                <><RefreshCw className="size-4 mr-2 animate-spin" /> Starting Stream...</>
              ) : (
                <><Play className="size-4 mr-2" /> Start Audio Stream</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/10 border-dashed">
        <CardContent className="py-6">
          <h3 className="font-semibold mb-2">💡 Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Audio forwarding requires Android 11+ and scrcpy v2.0+</li>
            <li>Use "Audio Duplicate" (--audio-dup) with "playback" source to keep audio on device</li>
            <li>Opus codec provides the best latency-to-quality ratio</li>
            <li>Raw PCM has zero latency but high bandwidth usage</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
