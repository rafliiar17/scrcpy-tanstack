import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import { useTauriEvent } from "@/hooks/use-tauri-event";
import {
  MIRROR_DEFAULTS,
  TAURI_EVENTS,
  type MirrorOptions,
  type MirrorStatus,
} from "@/lib/config";

// ── Default Options ──────────────────────────────────────────────

export function defaultMirrorOptions(deviceSerial: string): MirrorOptions {
  return {
    device: deviceSerial,
    bitrate: MIRROR_DEFAULTS.bitrate,
    max_fps: MIRROR_DEFAULTS.fps,
    resolution: "",
    codec: MIRROR_DEFAULTS.codec,
    rotation: "0",
    no_audio: !MIRROR_DEFAULTS.audio,
    fullscreen: MIRROR_DEFAULTS.fullscreen,
    borderless: false,
    always_on_top: MIRROR_DEFAULTS.alwaysOnTop,
    stay_awake: MIRROR_DEFAULTS.stayAwake,
    turn_screen_off: MIRROR_DEFAULTS.screenOff,
    no_control: false,
    window_title: "",
    custom_args: "",
    audio_source: "output",
  };
}

// ── Hooks ────────────────────────────────────────────────────────

export function useMirrorStatus(serial: string | null) {
  return useQuery({
    queryKey: ["mirrorStatus", serial],
    queryFn: () => api.getMirrorStatus(serial!),
    enabled: !!serial,
    refetchInterval: 2000,
  });
}

export function useMirror(serial: string | null) {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<string[]>([]);

  // Listen to log events
  useTauriEvent<string>(TAURI_EVENTS.log, (payload) => {
    setLogs((prev) => [...prev.slice(-200), payload]);
  });

  // Listen to process exit events
  useTauriEvent<MirrorStatus>(TAURI_EVENTS.processExit, (payload) => {
    if (payload.device === serial) {
      queryClient.invalidateQueries({ queryKey: ["mirrorStatus", serial] });
    }
  });

  const startMutation = useMutation({
    mutationFn: (opts: MirrorOptions) => api.startMirror(opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mirrorStatus", serial] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => {
      if (!serial) throw new Error("No device selected");
      return api.stopMirror(serial);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mirrorStatus", serial] });
    },
  });

  const buildCommand = useCallback(
    async (opts: MirrorOptions) => {
      return api.buildScrcpyCommand(opts);
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    startMirror: startMutation.mutate,
    stopMirror: stopMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    startError: startMutation.error,
    stopError: stopMutation.error,
    buildCommand,
    logs,
    clearLogs,
  };
}
