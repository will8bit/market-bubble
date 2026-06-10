"use client";

import { ChatMessage, Platform, StreamerId } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_X_WS_URL || "";

export const workerSocketEnabled = Boolean(WS_URL);

export interface SentMarker {
  id: string;
  handles: { twitch?: string; kick?: string };
  text: string;
  channels: { streamer: StreamerId; platform: Platform }[];
  global: boolean;
  at: number;
}

export type WorkerFrame =
  | { t: "backfill"; messages: ChatMessage[] }
  | { t: "msgs"; messages: ChatMessage[] }
  | { t: "stats"; stats: unknown }
  | ({ t: "sent" } & SentMarker);

type Handler = (frame: WorkerFrame) => void;

const handlers = new Set<Handler>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
  if (!WS_URL || ws) return;
  ws = new WebSocket(WS_URL);
  ws.onmessage = (e) => {
    try {
      const frame = JSON.parse(typeof e.data === "string" ? e.data : "") as WorkerFrame;
      handlers.forEach((h) => h(frame));
    } catch {}
  };
  ws.onclose = () => {
    ws = null;
    if (handlers.size > 0 && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 2000);
    }
  };
  ws.onerror = () => {
    try {
      ws?.close();
    } catch {}
  };
}

export function subscribeWorker(handler: Handler): () => void {
  handlers.add(handler);
  connect();
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      try {
        ws?.close();
      } catch {}
      ws = null;
    }
  };
}
