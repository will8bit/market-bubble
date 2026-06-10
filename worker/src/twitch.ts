import WebSocket from "ws";
import { Badge, ChatMessage, StreamerConfig, StreamerId, colorFor, extractCashtags } from "./types";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const pair of raw.slice(1).split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    tags[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return tags;
}

function mapBadges(badges: string | undefined): Badge[] {
  if (!badges) return [];
  const out: Badge[] = [];
  for (const entry of badges.split(",")) {
    const key = entry.split("/")[0];
    if (key === "broadcaster") out.push({ type: "broadcaster", label: "Host" });
    else if (key === "moderator") out.push({ type: "moderator", label: "Mod" });
    else if (key === "subscriber" || key === "founder") out.push({ type: "subscriber", label: "Sub" });
    else if (key === "vip") out.push({ type: "vip", label: "VIP" });
  }
  return out;
}

function injectTwitchEmotes(text: string, emotes: string | undefined): string {
  if (!emotes) return text;
  const chars = Array.from(text);
  const repls: { start: number; end: number; id: string }[] = [];
  for (const part of emotes.split("/")) {
    const [id, positions] = part.split(":");
    if (!id || !positions) continue;
    for (const range of positions.split(",")) {
      const [s, e] = range.split("-").map(Number);
      if (Number.isInteger(s) && Number.isInteger(e)) repls.push({ start: s, end: e, id });
    }
  }
  repls.sort((a, b) => b.start - a.start);
  for (const r of repls) {
    const name = chars.slice(r.start, r.end + 1).join("");
    chars.splice(r.start, r.end - r.start + 1, `[temote:${r.id}:${name}]`);
  }
  return chars.join("");
}

function parsePrivmsg(line: string, byChannel: Map<string, StreamerId>): ChatMessage | null {
  if (line[0] !== "@") return null;
  const firstSpace = line.indexOf(" ");
  if (firstSpace === -1) return null;
  const rest = line.slice(firstSpace + 1);
  if (!rest.includes("PRIVMSG")) return null;

  const channelMatch = rest.match(/PRIVMSG #(\S+) :/);
  if (!channelMatch) return null;
  const channel = channelMatch[1].toLowerCase();
  const streamer = byChannel.get(channel);
  if (!streamer) return null;

  const marker = `PRIVMSG #${channelMatch[1]} :`;
  const rawText = rest.slice(rest.indexOf(marker) + marker.length).replace(/[\r\n]+$/, "");

  const tags = parseTags(line.slice(0, firstSpace));
  const badges = mapBadges(tags["badges"]);
  const name = tags["display-name"] || rest.split("!")[0].replace(/^:/, "") || "anon";
  const text = injectTwitchEmotes(rawText, tags["emotes"]);

  return {
    id: tags["id"] || `tw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    platform: "twitch",
    streamer,
    author: {
      name,
      color: tags["color"] || colorFor(name),
      badges,
    },
    text,
    cashtags: extractCashtags(rawText),
    isMod: tags["mod"] === "1" || badges.some((b) => b.type === "moderator"),
    isSub: tags["subscriber"] === "1" || badges.some((b) => b.type === "subscriber"),
    isBroadcaster: badges.some((b) => b.type === "broadcaster"),
    timestamp: Date.now(),
  };
}

export function connectTwitch(
  streamers: StreamerConfig[],
  onMessage: (msg: ChatMessage) => void
): () => void {
  const targets = streamers.filter((s) => s.twitch);
  if (targets.length === 0) return () => {};

  const byChannel = new Map<string, StreamerId>();
  for (const s of targets) byChannel.set(s.twitch!.toLowerCase(), s.id);

  let ws: WebSocket | null = null;
  let stopped = false;

  function open() {
    ws = new WebSocket(IRC_URL);

    ws.on("open", () => {
      ws!.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws!.send("PASS SCHMOOPIIE");
      ws!.send(`NICK justinfan${Math.floor(Math.random() * 100000)}`);
      for (const s of targets) ws!.send(`JOIN #${s.twitch!.toLowerCase()}`);
      console.log(`[twitch] joined ${targets.map((s) => s.twitch).join(", ")}`);
    });

    ws.on("message", (raw) => {
      for (const line of raw.toString().split("\r\n")) {
        if (!line) continue;
        if (line.startsWith("PING")) {
          ws!.send("PONG :tmi.twitch.tv");
          continue;
        }
        const msg = parsePrivmsg(line, byChannel);
        if (msg) onMessage(msg);
      }
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
