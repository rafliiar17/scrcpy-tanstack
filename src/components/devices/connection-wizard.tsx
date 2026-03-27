import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Smartphone,
  Info,
  Laptop
} from "lucide-react";
import { api } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface ConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConnectionWizard({ open, onOpenChange, onSuccess }: ConnectionWizardProps) {
  const [step, setStep] = useState<"check" | "setup" | "guide">("check");
  const [status, setStatus] = useState<{ found: boolean; path: string; os: string; distro: string | null; bundled: boolean } | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open]);

  const checkStatus = async () => {
    try {
      const res = await api.getAdbStatus();
      setStatus(res);
      if (res.found) {
        setStep("check");
      } else {
        setStep("setup");
      }
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallProgress(10); // Start progress
    try {
      // Manual interval for better UX since real stream is hard without events
      const interval = setInterval(() => {
        setInstallProgress(p => (p < 90 ? p + 5 : p));
      }, 500);
      
      await api.downloadPlatformTools();
      clearInterval(interval);
      setInstallProgress(100);
      
      // Update status
      const newStatus = await api.getAdbStatus();
      setStatus(newStatus);
      setStep("check");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.toString());
      setIsInstalling(false);
    }
  };

  const renderLinuxGuide = () => {
    const distro = status?.distro || "unknown";
    
    return (
      <div className="space-y-4">
        <div className="p-3 bg-muted rounded-lg border border-border">
          <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5">
            <Terminal className="size-3" />
            Recommended Installation
          </p>
          <div className="bg-black/80 p-3 rounded font-mono text-[11px] text-green-400 relative group">
            {distro === "debian" ? "sudo apt-get install adb fastboot" : 
             distro === "arch" ? "sudo pacman -S android-tools" :
             distro === "fedora" ? "sudo dnf install android-tools" :
             "sudo apt install android-sdk-platform-tools"}
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => navigator.clipboard.writeText(distro === "debian" ? "sudo apt-get install adb fastboot" : "sudo apt install android-sdk-platform-tools")}
            >
                <code className="text-[10px]">COPY</code>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
            <p className="text-[11px] font-semibold flex items-center gap-1.5">
                <Info className="size-3 text-blue-500" />
                Additional Setup needed: udev Rules
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
                Linux needs specific permissions to access USB hardware. If your device lists as "??????", you must add it to /etc/udev/rules.d/51-android.rules.
            </p>
            <a 
              href="https://wiki.lineageos.org/adb_fastboot_guide#setting-up-udev-rules" 
              target="_blank" 
              rel="noreferrer"
              className={cn("h-4 p-0 text-[10px] text-primary underline-offset-4 hover:underline flex items-center")}
            >
                Show udev rules guide <ExternalLink className="ml-1 size-2" />
            </a>
        </div>
      </div>
    );
  };

  const renderMacGuide = () => {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-muted rounded-lg border border-border">
          <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5">
            <Laptop className="size-3" />
            Homebrew Installation
          </p>
          <div className="bg-black/80 p-3 rounded font-mono text-[11px] text-blue-400">
            brew install --cask android-platform-tools
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
            Note: Ensure ADB is in your system path after installation.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-yellow-500" />
            ADB Connection Wizard
          </DialogTitle>
          <DialogDescription className="text-xs">
            Let's get your Android devices talking to ScrcpyGUI Pro.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Status Overview */}
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-10 rounded-full flex items-center justify-center",
                status?.found ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {status?.found ? <CheckCircle2 className="size-6" /> : <Smartphone className="size-6" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none mb-1">ADB Binary Status</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                  {status?.bundled ? "Using Built-in ADB Tools" : status?.found ? `Found at: ${status.path}` : "Missing or Not in PATH"}
                </span>
              </div>
            </div>
            <Badge variant={status?.found ? "default" : "destructive"} className={cn("text-[10px]", status?.bundled && "bg-blue-500 hover:bg-blue-600")}>
              {status?.bundled ? "BUNDLED" : status?.found ? "READY" : "MISSING"}
            </Badge>
          </div>

          {step === "setup" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
              {status?.os === "windows" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                       <Download className="size-3 text-primary" />
                       Automated Windows Setup
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                       We can automatically download the official Android Platform Tools from Google and set them up for you. 
                       This will only affect this app and won't clutter your system.
                    </p>
                    
                    {isInstalling ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>Downloading zip from dl.google.com...</span>
                          <span>{installProgress}%</span>
                        </div>
                        <Progress value={installProgress} className="h-1.5" />
                      </div>
                    ) : (
                      <Button className="w-full h-8 text-[11px] font-bold" onClick={handleInstall}>
                        Download & Setup Automatically
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground bg-background px-2">OR</div>
                  </div>

                  <Button variant="outline" className="w-full h-8 text-[11px] font-bold" onClick={() => setStep("guide")}>
                    Manually Setup (LineageOS Guide)
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                    <p className="text-[11px] text-muted-foreground">
                        On <strong>{status?.os}</strong>, ADB is best managed via your package manager to ensure all dependencies are met.
                    </p>
                    {status?.os === "linux" ? renderLinuxGuide() : renderMacGuide()}
                    <a 
                      href="https://wiki.lineageos.org/adb_fastboot_guide" 
                      target="_blank" 
                      rel="noreferrer"
                      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-8 px-2.5 w-full text-[11px] font-bold mt-2")}
                    >
                        Open Platform Setup Guide
                    </a>
                </div>
              )}
            </div>
          )}

          {step === "guide" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] p-0" onClick={() => setStep("setup")}>
                    ← Back to setup
                </Button>
                {status?.os === "windows" && (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg text-[11px] space-y-2">
                        <p className="font-bold">1. Download ZIP</p>
                        <p className="text-muted-foreground">Download from <a href="https://dl.google.com/android/repository/platform-tools-latest-windows.zip" className="text-blue-500 underline">this link</a>.</p>
                        <p className="font-bold mt-2">2. Extract & Add to PATH</p>
                        <p className="text-muted-foreground">Extract the ZIP and add the folder path to your System Environment Variables.</p>
                    </div>
                  </div>
                )}
                <a 
                  href="https://wiki.lineageos.org/adb_fastboot_guide" 
                  target="_blank" 
                  rel="noreferrer"
                  className={cn("inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-8 px-2.5 w-full text-[11px]")}
                >
                    Read Full LineageOS Wiki Guide <ExternalLink className="ml-2 size-3" />
                </a>
             </div>
          )}

          {step === "check" && status?.found && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3 animate-in fade-in zoom-in duration-300">
               <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="size-10 text-green-500" />
               </div>
               <p className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">Everything looks good!</p>
               <p className="text-[11px] text-muted-foreground text-center max-w-[300px]">
                  ADB is running and ready. If your device still isn't showing up, ensure USB Debugging is ON in Android Developer Options.
               </p>
               <Button variant="secondary" className="mt-4 px-8" onClick={() => onOpenChange(false)}>
                  Close Wizard
               </Button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 text-[11px] flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <div className="flex-1 truncate">{error}</div>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setError(null)}>×</Button>
            </div>
          )}
        </div>

        <DialogFooter className="text-[10px] text-muted-foreground sm:justify-center border-t pt-4">
           Inspired by the LineageOS ADB & Fastboot Setup Guide
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
