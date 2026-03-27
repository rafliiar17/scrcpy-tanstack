import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import { listen } from "@tauri-apps/api/event";
import type { MiUnlockSession } from "@/lib/config";
import { useEffect } from "react";

export function useMiUnlock(onSuccess?: (data: { userId: string, ssecurity: string, nonce: string, location: string }) => void) {
  const getFastbootInfoMutation = useMutation({
    mutationFn: () => api.getFastbootDeviceInfo(),
  });

  const execUnlockMutation = useMutation({
    mutationFn: ({ session, product, token, region }: { 
      session: MiUnlockSession; 
      product: string; 
      token: string; 
      region: string 
    }) => api.execMiUnlock(session, product, token, region),
  });

  const fastbootUnlockMutation = useMutation({
    mutationFn: (encryptDataHex: string) => api.fastbootUnlock(encryptDataHex),
  });

  const openLoginMutation = useMutation({
    mutationFn: () => api.openMiLogin(),
  });

  const fetchSession = async () => {
    // This call will automatically include cookies from the shared webview session
    const response = await fetch(
      "https://account.xiaomi.com/pass/serviceLogin?sid=unlockApi&_json=true&passive=true&hidden=true"
    );
    const text = await response.text();
    // Xiaomi JSON responses often start with "&&&START&&&"
    const cleanText = text.replace("&&&START&&&", "");
    return JSON.parse(cleanText);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      console.log("Hook: Listening for mi-login events...");
      
      // Memory Scraper Listener (V3)
      const unlistenRaw = await listen<{type: string, data: string, url: string}>("mi-raw-data", async (event) => {
        const { type, data, url } = event.payload;
        console.log(`Hook: Raw data received (${type}) from ${url}`);
        
        let userId = "";
        let ssecurity = "";
        let nonce = new URL(url).searchParams.get("nonce") || "";

        if (type === 'cookies') {
          const cookieMap = Object.fromEntries(data.split(';').map(c => c.trim().split('=')));
          userId = cookieMap['userId'];
          ssecurity = cookieMap['ssecurity'];
        } else if (type === 'body') {
          try {
            const cleanData = data.replace('&&&START&&&', '');
            const json = JSON.parse(cleanData);
            userId = json.userId;
            ssecurity = json.ssecurity;
            if (json.nonce) nonce = json.nonce;
          } catch (e) { /* Not JSON */ }
        }

        if (userId && ssecurity) {
           console.log("Hook: Deep capture success!", userId);
           if (onSuccess) {
              onSuccess({ userId, ssecurity, nonce, location: url });
           }
           // Close window
           const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
           const win = await WebviewWindow.getByLabel("mi-login");
           if (win) await win.close();
        }
      });

      unlisten = await listen<string>("mi-login-success", async (event) => {
        const stsUrl = event.payload;
        // Navigation signal still useful
        console.log("Hook: Redirect detected. Memory scraper should pick it up...", stsUrl);
      });

      return () => {
        unlistenRaw();
        if (unlisten) unlisten();
      };
    };

    let cleanup: (() => void) | undefined;
    setupListener().then(c => cleanup = c);

    return () => {
      if (cleanup) cleanup();
    };
  }, [onSuccess]);

  return {
    getFastbootInfo: getFastbootInfoMutation.mutateAsync,
    isFetchingFastboot: getFastbootInfoMutation.isPending,
    fastbootInfo: getFastbootInfoMutation.data,

    execMiUnlock: execUnlockMutation.mutateAsync,
    isUnlockingApi: execUnlockMutation.isPending,
    unlockResult: execUnlockMutation.data,

    fastbootUnlock: fastbootUnlockMutation.mutateAsync,
    isUnlockingDevice: fastbootUnlockMutation.isPending,

    openLogin: openLoginMutation.mutateAsync,
    fetchSession,
  };
}
