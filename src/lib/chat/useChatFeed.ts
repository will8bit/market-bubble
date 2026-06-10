"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./types";
import { subscribeWorker, workerSocketEnabled } from "./workerSocket";
import { connectTwitch } from "./twitchClient";
import { connectKick } from "./kickClient";
import { twitchTargets, kickTargets } from "./channels";

const MAX_BUFFER = 400;

function dedupeAppend(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const ids = new Set(prev.map((m) => m.id));
  const add = incoming.filter((m) => !ids.has(m.id));
  if (!add.length) return prev;
  const next = prev.concat(add);
  return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
}

export function useChatFeed(paused: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const pausedRef = useRef(paused);
  const pendingRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    pendingRef.current = [];
    let cancelled = false;
    const stops: Array<() => void> = [];

    if (workerSocketEnabled) {
      stops.push(
        subscribeWorker((frame) => {
          if (frame.t === "backfill") {
            if (cancelled) return;
            setMessages((prev) => {
              const seen = new Set<string>();
              const out: ChatMessage[] = [];
              for (const m of [...frame.messages, ...prev]) {
                if (!seen.has(m.id)) {
                  seen.add(m.id);
                  out.push(m);
                }
              }
              return out.length > MAX_BUFFER ? out.slice(out.length - MAX_BUFFER) : out;
            });
          } else if (frame.t === "msgs") {
            pendingRef.current.push(...frame.messages);
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
      setMessages((prev) => dedupeAppend(prev, incoming));
    }, 150);

    return () => {
      cancelled = true;
      stops.forEach((s) => s());
      clearInterval(flush);
    };
  }, []);

  return messages;
}
