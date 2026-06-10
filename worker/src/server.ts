import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { ChatMessage } from "./types";
import { handleAuthRequest } from "./auth";

const FLUSH_MS = 250;
const RECENT_LIMIT = 100;

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
    recent.push(msg);
    if (recent.length > RECENT_LIMIT) recent = recent.slice(recent.length - RECENT_LIMIT);
  }

  function broadcastSent(marker: Record<string, unknown>) {
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
