import { useState } from "react";
import { useMiUnlock } from "@/hooks/use-miunlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, ShieldCheck, Key, LogIn, HardDrive, RefreshCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import type { MiUnlockSession } from "@/lib/config";

export function MiUnlockPage() {
  const { 
    getFastbootInfo, 
    isFetchingFastboot, 
    fastbootInfo,
    execMiUnlock,
    isUnlockingApi,
    fastbootUnlock,
    isUnlockingDevice,
    openLogin,
    fetchSession
  } = useMiUnlock(({ userId, ssecurity, nonce, location }) => {
    setSession((prev) => ({
      ...prev,
      user_id: userId,
      ssecurity,
      nonce,
      location_url: location,
    }));
    setStatus({ type: "success", message: `Auto-login successful for ${userId}!` });
  });

  const [cookieString, setCookieString] = useState("");
  const [region, setRegion] = useState("global");
  const [session, setSession] = useState<MiUnlockSession>({
    pass_token: "",
    service_token: "",
    user_id: "",
    device_id: "",
    ssecurity: "",
    location_url: "",
    nonce: "",
  });

  const [status, setStatus] = useState<{ type: "info" | "success" | "error"; message: string } | null>(null);

  const handleSmartLogin = async () => {
    try {
      setStatus({ type: "info", message: "Opening login window..." });
      await openLogin();
      setStatus({ type: "info", message: "Please login in the popup window. After success, click 'Capture Session' below." });
    } catch (e) {
      setStatus({ type: "error", message: `Failed to open login window: ${e}` });
    }
  };

  const handleCaptureSession = async () => {
    try {
      setStatus({ type: "info", message: "Capturing session data..." });
      const data = await fetchSession();
      
      if (data.userId && data.ssecurity) {
        setSession((prev) => ({
          ...prev,
          user_id: data.userId.toString(),
          ssecurity: data.ssecurity,
          nonce: data.nonce,
          location_url: data.location,
        }));
        setStatus({ type: "success", message: `Welcome ${data.userId}! Session captured successfully.` });
      } else {
         setStatus({ type: "error", message: "Could not find active session. Please login first in the popup." });
      }
    } catch (e) {
      setStatus({ type: "error", message: "Failed to capture session. Make sure you are logged in." });
    }
  };

  const parseCookie = () => {
    try {
      const cookies: Record<string, string> = {};
      cookieString.split(";").forEach((item) => {
        const parts = item.split("=");
        if (parts.length >= 2) {
          cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
        }
      });

      if (!cookies.passToken || !cookies.serviceToken || !cookies.userId || !cookies.deviceId) {
        setStatus({ type: "error", message: "Missing required cookies (passToken, serviceToken, userId, deviceId)" });
        return;
      }

      setSession((prev) => ({
        ...prev,
        pass_token: cookies.passToken,
        service_token: cookies.serviceToken,
        user_id: cookies.userId,
        device_id: cookies.deviceId,
      }));
      setStatus({ type: "success", message: "Cookies parsed successfully!" });
    } catch (e) {
      setStatus({ type: "error", message: "Failed to parse cookie string." });
    }
  };

  const handleFetchFastboot = async () => {
    try {
      setStatus({ type: "info", message: "Fetching fastboot device info..." });
      await getFastbootInfo();
      setStatus({ type: "success", message: "Found device in fastboot mode." });
    } catch (e) {
      setStatus({ type: "error", message: String(e) });
    }
  };

  const handleUnlock = async () => {
    if (!fastbootInfo) {
      setStatus({ type: "error", message: "Please fetch fastboot info first." });
      return;
    }

    if (!session.pass_token || !session.ssecurity) {
      setStatus({ type: "error", message: "Session data incomplete. Ssecurity is required." });
      return;
    }

    try {
      setStatus({ type: "info", message: "Requesting unlock data from Xiaomi API..." });
      const result = await execMiUnlock({
        session,
        product: fastbootInfo.product,
        token: fastbootInfo.token,
        region,
      });

      if (result.code === 0 && result.encrypt_data) {
        setStatus({ type: "info", message: "Unlock data retrieved. Proceeding to flash..." });
        
        const flashRes = await fastbootUnlock(result.encrypt_data);
        setStatus({ type: "success", message: flashRes });
      } else {
        setStatus({ type: "error", message: `API Error ${result.code}: ${result.desc}` });
      }
    } catch (e) {
      setStatus({ type: "error", message: String(e) });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-orange-500" /> Mi Unlock Pro
          </h2>
          <p className="text-muted-foreground">
            Official-based Bootloader Unlocker for Xiaomi/Redmi/Poco devices.
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 px-3 py-1">
          Xiaomi Community tool
        </Badge>
      </div>

      {status && (
        <Alert variant={status.type === "error" ? "destructive" : "default"} className={status.type === "success" ? "border-green-500/50 bg-green-500/5" : ""}>
          {status.type === "error" ? <AlertCircle className="size-4" /> : status.type === "success" ? <CheckCircle2 className="size-4 text-green-500" /> : <RefreshCcw className="size-4 animate-spin" />}
          <AlertTitle>{status.type.toUpperCase()}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Setup */}
        <Card className="shadow-sm border-orange-500/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LogIn className="size-4 text-orange-500" /> 1. Account Session
            </CardTitle>
            <CardDescription>
              Login automatically via popup or paste cookies manually from DevTools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="default" 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleSmartLogin}
              >
                <LogIn className="size-4 mr-2" />
                Login (Popup)
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCaptureSession}
              >
                <RefreshCcw className="size-4 mr-2" />
                Capture
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or Manual</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookie">Browser Cookies</Label>
              <div className="flex gap-2">
                <Input 
                  id="cookie" 
                  placeholder="Paste ENTIRE cookie string here..." 
                  value={cookieString}
                  onChange={(e) => setCookieString(e.target.value)}
                />
                <Button variant="secondary" onClick={parseCookie}>Parse</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input value={session.user_id} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Device ID (wb_id)</Label>
                <Input value={session.device_id} readOnly className="bg-muted/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssecurity">ssecurity (Important)</Label>
              <Input 
                id="ssecurity" 
                placeholder="Get from serviceLogin response in DevTools" 
                value={session.ssecurity}
                onChange={(e) => setSession({...session, ssecurity: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nonce">nonce (Optional/Fetch later)</Label>
              <Input 
                id="nonce" 
                placeholder="Session nonce" 
                value={session.nonce}
                onChange={(e) => setSession({...session, nonce: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Device Sync */}
        <Card className="shadow-sm border-blue-500/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="size-4 text-blue-500" /> 2. Fastboot Info
            </CardTitle>
            <CardDescription>
              Connect your device in Fastboot mode (Volume Down + Power).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
                variant="outline" 
                className="w-full flex items-center gap-2"
                onClick={handleFetchFastboot}
                disabled={isFetchingFastboot}
            >
              <HardDrive className={`size-4 ${isFetchingFastboot ? "animate-spin" : ""}`} />
              Fetch Device Data
            </Button>

            {fastbootInfo && (
              <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product (Codename):</span>
                  <span className="font-mono font-bold text-blue-600">{fastbootInfo.product}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Unlock Token:</span>
                  <div className="p-2 bg-background rounded border text-[10px] font-mono break-all line-clamp-2">
                    {fastbootInfo.token}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label>Unlock Region</Label>
              <Select value={region} onValueChange={(val) => val && setRegion(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global / International</SelectItem>
                  <SelectItem value="china">China</SelectItem>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="russia">Russia</SelectItem>
                  <SelectItem value="europe">Europe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12"
              onClick={handleUnlock}
              disabled={isUnlockingApi || isUnlockingDevice || !fastbootInfo || !session.ssecurity}
            >
              {isUnlockingApi || isUnlockingDevice ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  {isUnlockingApi ? "Requesting Signature..." : "Flashing Unlock Token..."}
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Request Unlock
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-dashed text-xs text-muted-foreground">
        <p className="font-semibold mb-1">Disclaimers & Notes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Unlocking the bootloader will <b>WIPE ALL USER DATA</b>. Back up your files!</li>
          <li>Some newer devices require waiting 168 hours (7 days) after binding account in Developer Options.</li>
          <li>Ensure batteries are above 50% and do not unplug the USB cable during the process.</li>
          <li>This tool replicates the official Mi Unlock client logic native in Rust.</li>
        </ul>
      </div>
    </div>
  );
}
