import WebSocket from "ws";
import { Badge, ChatMessage, StreamerConfig, StreamerId, colorFor, extractCashtags } from "./types";

const APP_KEY = process.env.KICK_PUSHER_KEY || "32cbd69e4b950bf97679";
const CLUSTER = process.env.KICK_PUSHER_CLUSTER || "us2";
const WS_URL = `wss://ws-${CLUSTER}.pusher.com/app/${APP_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchChatroomId(slug: string): Promise<number | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { chatroom?: { id?: number } };
    return data?.chatroom?.id ?? null;
  } catch {
    return null;
  }
}

function mapBadges(badges: Array<{ type?: string; text?: string }> | undefined): Badge[] {
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

export async function connectKick(
  streamers: StreamerConfig[],
  onMessage: (msg: ChatMessage) => void
): Promise<() => void> {
  const byChatroom = new Map<number, StreamerId>();

  for (const s of streamers) {
    if (!s.kick) continue;
    let id = s.kickChatroomId;
    if (!id) {
      const fetched = await fetchChatroomId(s.kick);
      if (fetched) id = fetched;
    }
    if (id) byChatroom.set(id, s.id);
    else console.warn(`[kick] could not resolve chatroom id for ${s.kick} (set ${s.id.toUpperCase()}_KICK_CHATROOM_ID)`);
  }

  if (byChatroom.size === 0) return () => {};

  let ws: WebSocket | null = null;
  let stopped = false;

  function open() {
    ws = new WebSocket(WS_URL);

    ws.on("message", (raw) => {
      let envelope: { event?: string; data?: string; channel?: string };
      try {
        envelope = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (envelope.event === "pusher:connection_established") {
        for (const id of byChatroom.keys()) {
          ws!.send(JSON.stringify({ event: "pusher:subscribe", data: { auth: "", channel: `chatrooms.${id}.v2` } }));
        }
        console.log(`[kick] subscribed to chatrooms ${Array.from(byChatroom.keys()).join(", ")}`);
        return;
      }

      if (envelope.event === "pusher:ping") {
        ws!.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        return;
      }
      if (envelope.event !== "App\\Events\\ChatMessageEvent" || !envelope.data) return;

      const chatroom = Number(envelope.channel?.split(".")[1]);
      const streamer = byChatroom.get(chatroom);
      if (!streamer) return;

      let payload: {
        id?: string;
        content?: string;
        sender?: { username?: string; identity?: { color?: string; badges?: Array<{ type?: string; text?: string }> } };
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
    });

    ws.on("close", () => {
      if (!stopped) setTimeout(open, 2000);
    });
    ws.on("error", () => {
      try {
        ws?.close();
      } catch {}
    });
  }

  open();
  return () => {
    stopped = true;
    try {
      ws?.close();
    } catch {}
  };
}
