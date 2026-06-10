"use client";

import { Badge, ChatMessage, StreamerId, colorFor, extractCashtags } from "./types";

const APP_KEY = "32cbd69e4b950bf97679";
const CLUSTER = "us2";
const WS_URL = `wss://ws-${CLUSTER}.pusher.com/app/${APP_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;

function mapBadges(badges: Array<{ type?: string }> | undefined): Badge[] {
  if (!badges) return [];
  const out: Badge[] = [];
  for (const b of badges) {
    switch (b.type) {
      case "broadcaster":
        out.push({ type: "broadcaster", label: "Host" });
        break;
      case "moderator":
        out.push({ type: "moderator", label: "Mod" });
        break;
      case "subscriber":
        out.push({ type: "subscriber", label: "Sub" });
        break;
      case "vip":
        out.push({ type: "vip", label: "VIP" });
        break;
      case "verified":
        out.push({ type: "verified", label: "Verified" });
        break;
      case "og":
        out.push({ type: "og", label: "OG" });
        break;
      default:
        break;
    }
  }
  return out;
}

export function connectKick(
  targets: { streamer: StreamerId; chatroomId: number }[],
  onMessage: (msg: ChatMessage) => void
): () => void {
  if (!targets.length) return () => {};

  const byChatroom = new Map<number, StreamerId>();
  for (const t of targets) byChatroom.set(t.chatroomId, t.streamer);

  let ws: WebSocket | null = null;
  let stopped = false;

  function open() {
    ws = new WebSocket(WS_URL);

    ws.onmessage = (ev) => {
      let envelope: { event?: string; data?: string; channel?: string };
      try {
        envelope = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }

      if (envelope.event === "pusher:connection_established") {
        for (const id of byChatroom.keys()) {
          ws!.send(JSON.stringify({ event: "pusher:subscribe", data: { auth: "", channel: `chatrooms.${id}.v2` } }));
        }
        return;
      }

      if (envelope.event === "pusher:ping") {
        ws!.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        return;
      }
      if (envelope.event !== "App\\Events\\ChatMessageEvent" || !envelope.data) return;

      const chatroom = Number(String(envelope.channel).split(".")[1]);
      const streamer = byChatroom.get(chatroom);
      if (!streamer) return;

      let payload: {
        id?: string;
        content?: string;
        sender?: { username?: string; identity?: { color?: string; badges?: Array<{ type?: string }> } };
      };
      try {
        payload = JSON.parse(envelope.data);
      } catch {
        return;
      }

      const name = payload.sender?.username || "anon";
      const text = payload.content || "";
      const badges = mapBadges(payload.sender?.identity?.badges);

      onMessage({
        id: payload.id || `kick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "kick",
        streamer,
        author: {
          name,
          color: payload.sender?.identity?.color || colorFor(name),
          badges,
        },
        text,
        cashtags: extractCashtags(text),
        isMod: badges.some((b) => b.type === "moderator"),
        isSub: badges.some((b) => b.type === "subscriber"),
        isBroadcaster: badges.some((b) => b.type === "broadcaster"),
        timestamp: Date.now(),
      });
    };

    ws.onclose = () => {
      if (!stopped) setTimeout(open, 2000);
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {}
    };
  }

  open();
  return () => {
    stopped = true;
    try {
      ws?.close();
    } catch {}
  };
}
