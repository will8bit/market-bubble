export type Platform = "twitch" | "kick" | "x";

export type StreamerId = "banks" | "ansem";

export interface Badge {
  type: "broadcaster" | "moderator" | "subscriber" | "vip" | "verified" | "og";
  label: string;
}

export interface ChatMessage {
  id: string;
  platform: Platform;
  streamer: StreamerId;
  author: {
    name: string;
    color: string;
    badges: Badge[];
  };
  text: string;
  cashtags: string[];
  isMod: boolean;
  isSub: boolean;
  isBroadcaster: boolean;
  timestamp: number;
}

export interface StreamerConfig {
  id: StreamerId;
  displayName: string;
  twitch?: string;
  kick?: string;
  kickChatroomId?: number;
}

const CASHTAG_RE = /\$[A-Za-z]{2,6}\b/g;

export function extractCashtags(text: string): string[] {
  const found = text.match(CASHTAG_RE);
  if (!found) return [];
  return Array.from(new Set(found.map((t) => t.slice(1).toUpperCase())));
}

const FALLBACK_COLORS = [
  "#ff6b6b", "#4dabf7", "#51cf66", "#ffd43b", "#cc5de8",
  "#22b8cf", "#ff922b", "#94d82d", "#f783ac", "#74c0fc",
];

export function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}
