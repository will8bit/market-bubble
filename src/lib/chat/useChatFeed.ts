"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./types";
import { subscribeWorker, workerSocketEnabled, type SentMarker } from "./workerSocket";
import { connectTwitch } from "./twitchClient";
import { connectKick } from "./kickClient";
import { twitchTargets, kickTargets } from "./channels";

const MAX_BUFFER = 400;
const MARKER_WINDOW = 12000;
const FALLBACK_WINDOW = 4000;

function matchMarker(msg: ChatMessage, markers: SentMarker[]): SentMarker | null {
  if (msg.platform !== "twitch" && msg.platform !== "kick") return null;
  const name = msg.author.name.toLowerCase();
  const text = msg.text.trim();
  for (const mk of markers) {
    if (Math.abs(msg.timestamp - mk.at) > MARKER_WINDOW) continue;
    if (mk.text.trim() !== text) continue;
    const handle = mk.handles[msg.platform];
    if (!handle || handle.toLowerCase() !== name) continue;
    if (!mk.channels.some((ch) => ch.platform === msg.platform && ch.streamer === msg.streamer)) continue;
    return mk;
  }
  return null;
}

export function useChatFeed(paused: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const pausedRef = useRef(paused);
  const pendingRef = useRef<ChatMessage[]>([]);
  const markersRef = useRef<SentMarker[]>([]);
  const keptRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    pendingRef.current = [];
    let cancelled = false;
    const stops: Array<() => void> = [];

    const integrate = (prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
      const ids = new Set(prev.map((m) => m.id));
      const accepted: ChatMessage[] = [];
      for (const raw of incoming) {
        if (ids.has(raw.id)) continue;
        ids.add(raw.id);
        const mk = matchMarker(raw, markersRef.current);
        if (mk) {
          if (keptRef.current.has(mk.id)) continue;
          keptRef.current.add(mk.id);
          accepted.push({ ...raw, multi: { channels: mk.channels, global: mk.global } });
          continue;
        }
        const name = raw.author.name.toLowerCase();
        const text = raw.text.trim();
        const dup =
          accepted.some(
            (m) =>
              m.author.name.toLowerCase() === name &&
              m.text.trim() === text &&
              Math.abs(m.timestamp - raw.timestamp) < FALLBACK_WINDOW
          ) ||
          prev.some(
            (m) =>
              m.author.name.toLowerCase() === name &&
              m.text.trim() === text &&
              Math.abs(m.timestamp - raw.timestamp) < FALLBACK_WINDOW
          );
        if (dup) continue;
        accepted.push(raw);
      }
      if (accepted.length === 0) return prev;
      const next = prev.concat(accepted);
      return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
    };

    if (workerSocketEnabled) {
      stops.push(
        subscribeWorker((frame) => {
          if (cancelled) return;
          if (frame.t === "backfill") {
            setMessages((prev) => integrate(prev, frame.messages));
          } else if (frame.t === "msgs") {
            pendingRef.current.push(...frame.messages);
          } else if (frame.t === "sent") {
            const now = Date.now();
            markersRef.current = markersRef.current.filter((m) => now - m.at < 20000);
            markersRef.current.push(frame);
          }
        })
      );
    }

    stops.push(connectTwitch(twitchTargets, (msg) => pendingRef.current.push(msg)));
    stops.push(connectKick(kickTargets, (msg) => pendingRef.current.push(msg)));

    const flush = setInterval(() => {
      if (pausedRef.current || pendingRef.current.length === 0) return;
      const incoming = pendingRef.current;
      pendingRef.current = [];
      setMessages((prev) => integrate(prev, incoming));
    }, 150);

    return () => {
      cancelled = true;
      stops.forEach((s) => s());
      clearInterval(flush);
    };
  }, []);

  return messages;
}
