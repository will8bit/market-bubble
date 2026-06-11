"use client";

import { useEffect, useRef } from "react";
import { useStats } from "@/lib/chat/StatsProvider";
import { useSettings } from "@/lib/settings";

export function GoLiveNotifier() {
  const stats = useStats();
  const { goLiveNotify } = useSettings();
  const wasLive = useRef<boolean | null>(null);
  const live = Boolean(stats?.viewers.twitchStartedAt);

  useEffect(() => {
    const prev = wasLive.current;
    wasLive.current = live;
    if (prev === null || prev || !live) return;
    if (!goLiveNotify) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification("Market Bubble is live", {
        body: "The show just went live — jump in.",
      });
    } catch {}
  }, [live, goLiveNotify]);

  return null;
}
