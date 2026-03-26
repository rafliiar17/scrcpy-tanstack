import { useState } from "react";
import { Radio, Play, Volume2, RefreshCw } from "lucide-react";
import { useSelectedDevice } from "@/hooks/use-devices";
import { useMirror, defaultMirrorOptions } from "@/hooks/use-mirror";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LivestreamPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial;
  const { startMirror, isStarting } = useMirror(serial ?? null);

  const [audioSource, setAudioSource] = useState("output");
  const [audioCodec, setAudioCodec] = useState("opus");
  const [noVideo, setNoVideo] = useState(false);

  const handleStartAudio = () => {
    if (!serial) return;
    const opts = {
      ...defaultMirrorOptions(serial),
      no_audio: false,
      audio_source: audioSource,
      audio_codec: audioCodec,
      no_control: true,
      window_title: `Audio - ${selectedDevice?.model ?? serial}`,
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
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Audio Source</label>
              <select
                value={audioSource}
                onChange={(e) => setAudioSource(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="output">Device Output (All Sounds)</option>
                <option value="playback">App Playback (may exclude some apps)</option>
                <option value="mic">Microphone</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                "Output" captures all device audio. "Playback" allows audio to still play on device.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Audio Codec</label>
              <select
                value={audioCodec}
                onChange={(e) => setAudioCodec(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="opus">Opus (Recommended)</option>
                <option value="aac">AAC</option>
                <option value="flac">FLAC (Lossless)</option>
                <option value="raw">Raw PCM</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
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
                Disable video mirroring, only stream audio to desktop
              </span>
            </label>
          </div>

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
