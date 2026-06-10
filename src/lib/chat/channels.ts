import { StreamerId } from "./types";

export interface ChannelConfig {
  id: StreamerId;
  twitch?: string;
  kick?: { slug: string; chatroomId: number };
}

export const CHANNELS: ChannelConfig[] = [
  { id: "banks", twitch: "clix", kick: { slug: "solomission", chatroomId: 2218947 } },
  { id: "ansem" },
];

export const twitchTargets = CHANNELS.filter((c) => c.twitch).map((c) => ({
  streamer: c.id,
  login: c.twitch as string,
}));

export const kickTargets = CHANNELS.filter((c) => c.kick).map((c) => ({
  streamer: c.id,
  chatroomId: (c.kick as { slug: string; chatroomId: number }).chatroomId,
}));
