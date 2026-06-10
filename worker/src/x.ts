import WebSocket from "ws";
import { ChatMessage, StreamerId, colorFor, extractCashtags } from "./types";

const X_WEB_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

interface Bootstrap {
  broadcastId: string;
  endpoint: string;
  accessToken: string;
}

function extractBroadcastId(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/broadcasts\/([^/?#]+)/);
    if (match?.[1]) return match[1];
  } catch {}
  if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  throw new Error(`could not extract broadcast id from ${input}`);
}

function xHeaders(guestToken?: string): Record<string, string> {
  return {
    authorization: `Bearer ${X_WEB_BEARER}`,
    accept: "application/json, text/plain, */*",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "user-agent": UA,
    ...(guestToken ? { "x-guest-token": guestToken } : {}),
  };
}

async function getJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${text.slice(0, 160)}`);
  return JSON.parse(text) as T;
}

async function bootstrap(inputUrl: string): Promise<Bootstrap> {
  const broadcastId = extractBroadcastId(inputUrl);

  const guest = await getJson<{ guest_token?: string }>("https://api.x.com/1.1/guest/activate.json", {
    method: "POST",
    headers: xHeaders(),
  });
  if (!guest.guest_token) throw new Error("no guest token");

  const show = await getJson<{ broadcasts?: Record<string, { media_key?: string }> }>(
    `https://x.com/i/api/1.1/broadcasts/show.json?ids=${encodeURIComponent(broadcastId)}`,
    { headers: xHeaders(guest.guest_token) }
  );
  const mediaKey = show.broadcasts?.[broadcastId]?.media_key;
  if (!mediaKey) throw new Error(`no media_key for ${broadcastId}`);

  const status = await getJson<{ chatToken?: string }>(
    `https://x.com/i/api/1.1/live_video_stream/status/${encodeURIComponent(mediaKey)}?client=web`,
    { headers: xHeaders(guest.guest_token) }
  );
  if (!status.chatToken) throw new Error(`no chatToken for ${broadcastId}`);

  const access = await getJson<{
    access_token?: string;
    replay_access_token?: string;
    endpoint?: string;
    replay_endpoint?: string;
  }>("https://proxsee-cf.pscp.tv/api/v2/accessChatPublic", {
    method: "POST",
    headers: {
      accept: "*/*",
      origin: "https://x.com",
      referer: "https://x.com/",
      "content-type": "application/json",
      "x-periscope-user-agent": "Twitter/m5",
      "user-agent": UA,
    },
    body: JSON.stringify({ chat_token: status.chatToken }),
  });
  const endpoint = access.endpoint ?? access.replay_endpoint;
  const accessToken = access.access_token ?? access.replay_access_token;
  if (!endpoint || !accessToken) throw new Error(`no chat endpoint for ${broadcastId}`);

  return { broadcastId, endpoint: endpoint.replace(/\/$/, ""), accessToken };
}

interface ParsedChat {
  uuid: string;
  username: string;
  displayName: string;
  text: string;
  timestampMs: number;
}

function parseChatFrame(data: string): ParsedChat | null {
  let outer: { kind?: number; payload?: string };
  try {
    outer = JSON.parse(data);
  } catch {
    return null;
  }
  if (outer.kind !== 1 || !outer.payload) return null;

  let mid: { body?: unknown };
  try {
    mid = JSON.parse(outer.payload);
  } catch {
    return null;
  }

  let inner: { body?: string; username?: string; displayName?: string; uuid?: string; timestamp?: number };
  if (typeof mid.body === "string") {
    try {
      inner = JSON.parse(mid.body);
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const text = typeof inner.body === "string" ? inner.body.trim() : "";
  if (!text) return null;

  const username = inner.username || "anon";
  return {
    uuid: inner.uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    displayName: inner.displayName || username,
    text,
    timestampMs: typeof inner.timestamp === "number" ? inner.timestamp : Date.now(),
  };
}

function parseOccupancy(data: string): number | null {
  let outer: { kind?: number; payload?: string };
  try {
    outer = JSON.parse(data);
  } catch {
    return null;
  }
  if (outer.kind !== 2 || !outer.payload) return null;
  let inner: { kind?: number; body?: string };
  try {
    inner = JSON.parse(outer.payload);
  } catch {
    return null;
  }
  if (inner.kind !== 4 || typeof inner.body !== "string") return null;
  try {
    const b = JSON.parse(inner.body) as { occupancy?: number };
    return typeof b.occupancy === "number" ? b.occupancy : null;
  } catch {
    return null;
  }
}

function toChatMessage(streamer: StreamerId, p: ParsedChat): ChatMessage {
  return {
    id: `x-${p.uuid}`,
    platform: "x",
    streamer,
    author: {
      name: p.displayName || p.username,
      color: colorFor(p.username),
      badges: [],
    },
    text: p.text,
    cashtags: extractCashtags(p.text),
    isMod: false,
    isSub: false,
    isBroadcaster: false,
    timestamp: p.timestampMs,
  };
}

export function connectX(
  targets: { streamer: StreamerId; url: string }[],
  onMessage: (msg: ChatMessage) => void,
  onOccupancy?: (streamer: StreamerId, count: number) => void
): () => void {
  if (!targets.length) return () => {};
  let stopped = false;
  const closers: Array<() => void> = [];

  for (const t of targets) {
    let ws: WebSocket | null = null;

    async function start() {
      if (stopped) return;
      try {
        const boot = await bootstrap(t.url);
        const wsUrl = `${boot.endpoint.replace(/^http/, "ws")}/chatapi/v1/chatnow`;
        ws = new WebSocket(wsUrl);

        ws.on("open", () => {
          ws!.send(JSON.stringify({ payload: JSON.stringify({ access_token: boot.accessToken }), kind: 3 }));
          ws!.send(
            JSON.stringify({
              payload: JSON.stringify({ body: JSON.stringify({ room: boot.broadcastId }), kind: 1 }),
              kind: 2,
            })
          );
          console.log(`[x] connected to broadcast ${boot.broadcastId} (${t.streamer})`);
        });

        ws.on("message", (raw) => {
          const data = raw.toString();
          const parsed = parseChatFrame(data);
          if (parsed) {
            onMessage(toChatMessage(t.streamer, parsed));
            return;
          }
          if (onOccupancy) {
            const occ = parseOccupancy(data);
            if (occ != null) onOccupancy(t.streamer, occ);
          }
        });

        ws.on("close", () => {
          if (!stopped) setTimeout(start, 3000);
        });
        ws.on("error", () => {
          try {
            ws?.close();
          } catch {}
        });
      } catch (err) {
        console.error(`[x] ${t.url}: ${err instanceof Error ? err.message : err}`);
        if (!stopped) setTimeout(start, 5000);
      }
    }

    start();
    closers.push(() => {
      try {
        ws?.close();
      } catch {}
    });
  }

  return () => {
    stopped = true;
    closers.forEach((c) => c());
  };
}
