import { StreamerConfig } from "./types";
import { twitchAppToken } from "./viewers";

export interface MediaClip {
  id: string;
  streamer: string;
  title: string;
  thumbnail: string;
  url: string;
  views: number;
  duration: number;
  createdAt: string;
  creator: string;
}

export interface MediaVideo {
  id: string;
  streamer: string;
  title: string;
  thumbnail: string;
  url: string;
  duration: string;
  createdAt: string;
  views: number;
}

export interface TwitchMedia {
  clips: MediaClip[];
  broadcasts: MediaVideo[];
}

interface RawClip {
  id: string;
  title?: string;
  thumbnail_url?: string;
  url?: string;
  view_count?: number;
  duration?: number;
  created_at?: string;
  creator_name?: string;
}

interface RawVideo {
  id: string;
  title?: string;
  thumbnail_url?: string;
  url?: string;
  view_count?: number;
  duration?: string;
  created_at?: string;
  published_at?: string;
}

const idCache = new Map<string, string>();

function thumb(url: string, w: number, h: number): string {
  return url.replace("%{width}", String(w)).replace("%{height}", String(h));
}

async function resolveUserIds(
  logins: string[],
  clientId: string,
  token: string
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const need: string[] = [];
  for (const l of logins) {
    const key = l.toLowerCase();
    const cached = idCache.get(key);
    if (cached) out[key] = cached;
    else need.push(key);
  }
  if (need.length) {
    try {
      const qs = need.map((l) => `login=${encodeURIComponent(l)}`).join("&");
      const res = await fetch(`https://api.twitch.tv/helix/users?${qs}`, {
        headers: { "Client-Id": clientId, authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = (await res.json()) as { data?: Array<{ id?: string; login?: string }> };
        for (const u of d.data || []) {
          if (u.id && u.login) {
            const key = u.login.toLowerCase();
            idCache.set(key, u.id);
            out[key] = u.id;
          }
        }
      }
    } catch {}
  }
  return out;
}

async function fetchClips(
  broadcasterId: string,
  clientId: string,
  token: string
): Promise<RawClip[]> {
  const headers = { "Client-Id": clientId, authorization: `Bearer ${token}` };
  for (const days of [7, 30]) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    try {
      const res = await fetch(
        `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&first=20&started_at=${since}`,
        { headers }
      );
      if (res.ok) {
        const d = (await res.json()) as { data?: RawClip[] };
        if (d.data && d.data.length > 0) return d.data;
      }
    } catch {}
  }
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&first=20`,
      { headers }
    );
    if (res.ok) {
      const d = (await res.json()) as { data?: RawClip[] };
      return d.data || [];
    }
  } catch {}
  return [];
}

async function fetchVideos(
  userId: string,
  clientId: string,
  token: string
): Promise<RawVideo[]> {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=10&sort=time`,
      { headers: { "Client-Id": clientId, authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const d = (await res.json()) as { data?: RawVideo[] };
    return d.data || [];
  } catch {
    return [];
  }
}

export async function getTwitchMedia(streamers: StreamerConfig[]): Promise<TwitchMedia> {
  const clientId = process.env.TWITCH_CLIENT_ID || "";
  const empty: TwitchMedia = { clips: [], broadcasts: [] };
  if (!clientId) return empty;
  const token = await twitchAppToken();
  if (!token) return empty;

  const withTwitch = streamers.filter((s) => s.twitch);
  const logins = withTwitch.map((s) => s.twitch as string);
  const ids = await resolveUserIds(logins, clientId, token);

  const clips: MediaClip[] = [];
  const broadcasts: MediaVideo[] = [];

  for (const s of withTwitch) {
    const id = ids[(s.twitch as string).toLowerCase()];
    if (!id) continue;
    const [rawClips, rawVids] = await Promise.all([
      fetchClips(id, clientId, token),
      fetchVideos(id, clientId, token),
    ]);
    for (const c of rawClips) {
      clips.push({
        id: c.id,
        streamer: s.id,
        title: c.title || "Clip",
        thumbnail: c.thumbnail_url || "",
        url: c.url || `https://clips.twitch.tv/${c.id}`,
        views: c.view_count || 0,
        duration: c.duration || 0,
        createdAt: c.created_at || "",
        creator: c.creator_name || "",
      });
    }
    for (const v of rawVids) {
      broadcasts.push({
        id: v.id,
        streamer: s.id,
        title: v.title || "Broadcast",
        thumbnail: thumb(v.thumbnail_url || "", 320, 180),
        url: v.url || `https://www.twitch.tv/videos/${v.id}`,
        duration: v.duration || "",
        createdAt: v.created_at || v.published_at || "",
        views: v.view_count || 0,
      });
    }
  }

  clips.sort((a, b) => b.views - a.views);
  broadcasts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { clips: clips.slice(0, 16), broadcasts: broadcasts.slice(0, 12) };
}
