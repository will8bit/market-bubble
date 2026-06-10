import { StreamerId } from "./types";

export interface ChannelConfig {
  id: StreamerId;
  twitch?: string;
  kick?: { slug: string; chatroomId: number };
}

function build(
  id: StreamerId,
  twitch: string | undefined,
  slug: string | undefined,
  chatroomId: string | undefined
): ChannelConfig {
  const out: ChannelConfig = { id };
  if (twitch) out.twitch = twitch;
  if (slug) out.kick = { slug, chatroomId: Number(chatroomId) || 0 };
  return out;
}

export const CHANNELS: ChannelConfig[] = [
  build(
    "banks",
    process.env.NEXT_PUBLIC_BANKS_TWITCH,
    process.env.NEXT_PUBLIC_BANKS_KICK,
    process.env.NEXT_PUBLIC_BANKS_KICK_CHATROOM_ID
  ),
  build(
    "ansem",
    process.env.NEXT_PUBLIC_ANSEM_TWITCH,
    process.env.NEXT_PUBLIC_ANSEM_KICK,
    process.env.NEXT_PUBLIC_ANSEM_KICK_CHATROOM_ID
  ),
];

export const twitchTargets = CHANNELS.filter((c) => c.twitch).map((c) => ({
  streamer: c.id,
  login: c.twitch as string,
}));

export const kickTargets = CHANNELS.filter((c) => c.kick).map((c) => ({
  streamer: c.id,
  chatroomId: (c.kick as { slug: string; chatroomId: number }).chatroomId,
}));
