import { useEffect, useRef, useCallback } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Subscribe to a Tauri event. Handler is stored in a ref so the subscription
 * doesn't churn when the handler closure changes. Re-subscribes only when
 * eventName changes. Cleans up on unmount.
 */
export function useTauriEvent<T>(
  eventName: string | null,
  handler: (payload: T) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableHandler = useCallback((event: { payload: T }) => {
    handlerRef.current(event.payload);
  }, []);

  useEffect(() => {
    if (!eventName) return;

    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    listen<T>(eventName, stableHandler).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [eventName, stableHandler]);
}
