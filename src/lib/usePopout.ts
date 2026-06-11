"use client";

import { useEffect, useRef, useState } from "react";

const CHANNEL = "mb-popout";
const STALE_MS = 3000;
const PING_MS = 1000;

type PopoutMsg =
  | { type: "open"; key: string }
  | { type: "ping"; key: string }
  | { type: "close"; key: string }
  | { type: "query"; key: string }
  | { type: "requestClose"; key: string };

export function usePopoutHost(key: string, enabled = true): boolean {
  const [open, setOpen] = useState(false);
  const lastSeen = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);

    const onMsg = (e: MessageEvent<PopoutMsg>) => {
      const d = e.data;
      if (!d || d.key !== key) return;
      if (d.type === "open" || d.type === "ping") {
        lastSeen.current = Date.now();
        setOpen(true);
      } else if (d.type === "close") {
        lastSeen.current = 0;
        setOpen(false);
      }
    };

    bc.addEventListener("message", onMsg);
    bc.postMessage({ type: "query", key } satisfies PopoutMsg);

    const t = setInterval(() => {
      if (lastSeen.current && Date.now() - lastSeen.current > STALE_MS) {
        lastSeen.current = 0;
        setOpen(false);
      }
    }, PING_MS);

    return () => {
      bc.removeEventListener("message", onMsg);
      bc.close();
      clearInterval(t);
    };
  }, [key, enabled]);

  return enabled && open;
}

export function usePopoutClient(key: string, active = true): void {
  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);

    const announce = () => bc.postMessage({ type: "open", key } satisfies PopoutMsg);
    announce();

    const onMsg = (e: MessageEvent<PopoutMsg>) => {
      const d = e.data;
      if (!d || d.key !== key) return;
      if (d.type === "query") announce();
      else if (d.type === "requestClose") window.close();
    };
    bc.addEventListener("message", onMsg);

    const ping = setInterval(() => bc.postMessage({ type: "ping", key } satisfies PopoutMsg), PING_MS);

    const onUnload = () => {
      try {
        bc.postMessage({ type: "close", key } satisfies PopoutMsg);
      } catch {}
    };
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      onUnload();
      bc.removeEventListener("message", onMsg);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      bc.close();
      clearInterval(ping);
    };
  }, [key, active]);
}

export function requestClosePopout(key: string): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  const bc = new BroadcastChannel(CHANNEL);
  bc.postMessage({ type: "requestClose", key } satisfies PopoutMsg);
  setTimeout(() => bc.close(), 200);
}
