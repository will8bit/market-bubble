import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { ChatMessage, StreamerId, Platform } from "./types";
import { handleAuthRequest } from "./auth";

const FLUSH_MS = 250;
const RECENT_LIMIT = 100;
const MARKER_WINDOW = 12000;

interface Marker {
  id: string;
  handles: { twitch?: string; kick?: string };
  text: string;
  channels: { streamer: StreamerId; platform: Platform }[];
  global: boolean;
  at: number;
}

function matchesMarker(msg: ChatMessage, mk: Marker): boolean {
  if (msg.platform !== "twitch" && msg.platform !== "kick") return false;
  if (msg.timestamp < mk.at - 2000 || msg.timestamp > mk.at + MARKER_WINDOW) return false;
  if (mk.text.trim() !== msg.text.trim()) return false;
  const handle = mk.handles[msg.platform];
  if (!handle || handle.toLowerCase() !== msg.author.name.toLowerCase()) return false;
  return mk.channels.some((ch) => ch.platform === msg.platform && ch.streamer === msg.streamer);
}

export interface FanoutServer {
  broadcast(msg: ChatMessage): void;
  record(msg: ChatMessage): void;
  pushStats(stats: unknown): void;
  clientCount(): number;
  stop(): void;
}

export function createFanoutServer(port: number): FanoutServer {
  const http = createServer((req, res) => {
    handleAuthRequest(req, res, { broadcastSent })
      .then((handled) => {
        if (handled) return;
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("market-bubble worker ok");
      })
      .catch(() => {
        try {
          res.writeHead(500, { "content-type": "text/plain" });
          res.end("error");
        } catch {}
      });
  });

  const wss = new WebSocketServer({ server: http });
  const clients = new Set<WebSocket>();
  let recent: ChatMessage[] = [];
  let buffer: ChatMessage[] = [];
  let latestStats: unknown = null;
  let markers: Marker[] = [];
  const keptMarkers = new Set<string>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    try {
      ws.send(JSON.stringify({ t: "backfill", messages: recent }));
      if (latestStats) ws.send(JSON.stringify({ t: "stats", stats: latestStats }));
    } catch {}
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => {
      try {
        ws.close();
      } catch {}
      clients.delete(ws);
    });
  });

  const timer = setInterval(() => {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    if (clients.size === 0) return;
    const payload = JSON.stringify({ t: "msgs", messages: batch });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {}
      }
    }
  }, FLUSH_MS);

  http.listen(port, () => console.log(`[fanout] websocket server listening on :${port}`));

  function addRecent(msg: ChatMessage) {
    const mk = markers.find((m) => matchesMarker(msg, m));
    let stored = msg;
    if (mk) {
      if (keptMarkers.has(mk.id)) return;
      keptMarkers.add(mk.id);
      stored = { ...msg, multi: { channels: mk.channels, global: mk.global } };
    }
    recent.push(stored);
    if (recent.length > RECENT_LIMIT) recent = recent.slice(recent.length - RECENT_LIMIT);
  }

  function noteSentMarker(mk: Marker) {
    const now = Date.now();
    markers = markers.filter((m) => now - m.at < 20000);
    markers.push(mk);
    let tagged = false;
    let found = false;
    const out: ChatMessage[] = [];
    for (const m of recent) {
      if (matchesMarker(m, mk)) {
        found = true;
        if (!tagged) {
          tagged = true;
          out.push({ ...m, multi: { channels: mk.channels, global: mk.global } });
        }
      } else {
        out.push(m);
      }
    }
    if (found) keptMarkers.add(mk.id);
    recent = out;
  }

  function broadcastSent(marker: Record<string, unknown>) {
    noteSentMarker(marker as unknown as Marker);
    const payload = JSON.stringify({ t: "sent", ...marker });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {}
      }
    }
  }

  return {
    broadcast(msg: ChatMessage) {
      buffer.push(msg);
      addRecent(msg);
    },
    record(msg: ChatMessage) {
      addRecent(msg);
    },
    pushStats(stats: unknown) {
      latestStats = stats;
      const payload = JSON.stringify({ t: "stats", stats });
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(payload);
          } catch {}
        }
      }
    },
    clientCount() {
      return clients.size;
    },
    stop() {
      clearInterval(timer);
      for (const ws of clients) {
        try {
          ws.close();
        } catch {}
      }
      wss.close();
      http.close();
    },
  };
}
