import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useSelectedDevice } from "@/hooks/use-devices";
import { api } from "@/lib/tauri";
import { listen } from "@tauri-apps/api/event";

export function ShellPage() {
  const { selectedDevice } = useSelectedDevice();
  const serial = selectedDevice?.serial ?? null;
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  const setupStarted = useRef(false);

  useEffect(() => {
    if (!serial || !terminalRef.current || setupStarted.current) return;
    setupStarted.current = true;

    // Initialize Terminal with a more premium theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      allowProposedApi: true,
      fontFamily: '"JetBrains Mono", "Geist Mono", monospace',
      theme: {
        background: "transparent",
        foreground: "#e5e7eb", // gray-200
        cursor: "#3b82f6",     // blue-500
        selectionBackground: "rgba(59, 130, 246, 0.3)",
        black: "#000000",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#f9fafb",
      },
      rows: 40,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Immediate fit and also after a short delay
    const fit = () => {
      try { fitAddon.fit(); } catch (e) {}
    };
    fit();
    const fitTimer = setTimeout(fit, 200);
    
    xtermRef.current = term;

    term.writeln(`\r\n\u001b[34m[SC] \u001b[33mConnecting to interactive shell on device: [${serial}]...\u001b[0m\r\n`);

    let unlistenFn: (() => void) | null = null;

    const setup = async () => {
      try {
        // Fetch history first
        const history = await api.getShellHistory(serial);
        if (history.length > 0) {
          term.write(history.join(""));
        }

        await api.startShell(serial);
        const safeSerial = serial.replace(/[^a-zA-Z0-9]/g, "_");
        unlistenFn = await listen<string>(`shell-stdout-${safeSerial}`, (event) => {
          term.write(event.payload);
        });
        
        term.writeln(`\u001b[34m[SC] \u001b[32mSession established.\u001b[0m\r\n`);
        
        // Wake up shell (sometimes helpful for initial prompt)
        await api.writeToShell(serial, "\n");
      } catch (err) {
        term.writeln(`\r\n\u001b[31m[SC] Error initializing shell: ${err}\u001b[0m`);
      }
    };

    setup();

    term.onData(async (data) => {
      try {
        await api.writeToShell(serial, data);
      } catch (err) {
        console.error("Shell write error:", err);
      }
    });

    window.addEventListener("resize", fit);

    return () => {
      clearTimeout(fitTimer);
      window.removeEventListener("resize", fit);
      if (unlistenFn) unlistenFn();
      // Keep shell alive in background
      // api.stopShell(serial);
      term.dispose();
      setupStarted.current = false;
    };
  }, [serial]);

  if (!serial) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/30 py-24">
        <div className="text-center">
            <p className="text-xl font-medium tracking-tight">No Device Selected</p>
            <p className="text-muted-foreground mt-2">Please select a device to start an interactive shell.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded-xl border bg-[#0a0a0a] shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-destructive/50" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
            <div className="h-3 w-3 rounded-full bg-green-500/50" />
          </div>
          <span className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Interactive Shell — {serial}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/40 font-mono">
          ADB v1.0.41
        </div>
      </div>
      
      {/* Terminal Content */}
      <div className="relative h-full w-full p-2">
        <div 
          ref={terminalRef} 
          className="h-full w-full [&_.xterm-viewport]:!bg-transparent" 
        />
      </div>
    </div>
  );
}
