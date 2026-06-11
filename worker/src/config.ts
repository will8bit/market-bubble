import { StreamerConfig, StreamerId } from "./types";

export const CHAT_CHANNEL = process.env.CHAT_CHANNEL || "market-bubble-chat";

export const ADMIN_USERS = new Set(
  (process.env.ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

function num(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export const STREAMERS: StreamerConfig[] = [
  {
    id: "banks",
    displayName: "Banks",
    twitch: process.env.BANKS_TWITCH || "",
    kick: process.env.BANKS_KICK || "",
    kickChatroomId: num(process.env.BANKS_KICK_CHATROOM_ID),
  },
  {
    id: "ansem",
    displayName: "Ansem",
    twitch: process.env.ANSEM_TWITCH || "",
    kick: process.env.ANSEM_KICK || "",
    kickChatroomId: num(process.env.ANSEM_KICK_CHATROOM_ID),
  },
];

const xTargets: { streamer: StreamerId; url: string }[] = [
  { streamer: "banks", url: process.env.BANKS_X_BROADCAST || "" },
  { streamer: "ansem", url: process.env.ANSEM_X_BROADCAST || "" },
];

export const X_TARGETS = xTargets.filter((t) => t.url);
