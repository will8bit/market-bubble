const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

let twitchToken = "";
let twitchTokenExp = 0;

export async function twitchAppToken(): Promise<string> {
  const id = process.env.TWITCH_CLIENT_ID || "";
  const secret = process.env.TWITCH_CLIENT_SECRET || "";
  if (!id || !secret) return "";
  if (twitchToken && Date.now() < twitchTokenExp) return twitchToken;
  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
      { method: "POST" }
    );
    if (!res.ok) return "";
    const d = (await res.json()) as { access_token?: string; expires_in?: number };
    twitchToken = d.access_token || "";
    twitchTokenExp = Date.now() + ((d.expires_in || 3600) - 120) * 1000;
    return twitchToken;
  } catch {
    return "";
  }
}

export interface TwitchStream {
  viewers: number;
  startedAt: string | null;
}

export async function getTwitchViewers(logins: string[]): Promise<Record<string, TwitchStream>> {
  const out: Record<string, TwitchStream> = {};
  const id = process.env.TWITCH_CLIENT_ID || "";
  if (!id || logins.length === 0) return out;
  const token = await twitchAppToken();
  if (!token) return out;
  try {
    const qs = logins.map((l) => `user_login=${encodeURIComponent(l.toLowerCase())}`).join("&");
    const res = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, {
      headers: { "Client-Id": id, authorization: `Bearer ${token}` },
    });
    if (!res.ok) return out;
    const d = (await res.json()) as {
      data?: Array<{ user_login?: string; viewer_count?: number; started_at?: string }>;
    };
    for (const s of d.data || []) {
      if (s.user_login) {
        out[s.user_login.toLowerCase()] = {
          viewers: s.viewer_count || 0,
          startedAt: s.started_at || null,
        };
      }
    }
    return out;
  } catch {
    return out;
  }
}

const kickCache = new Map<string, { viewers: number; at: number }>();
const KICK_STALE_MS = 180000;

let kickToken = "";
let kickTokenExp = 0;

async function kickAppToken(): Promise<string> {
  const id = process.env.KICK_CLIENT_ID || "";
  const secret = process.env.KICK_CLIENT_SECRET || "";
  if (!id || !secret) return "";
  if (kickToken && Date.now() < kickTokenExp) return kickToken;
  try {
    const res = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    });
    if (!res.ok) return "";
    const d = (await res.json()) as { access_token?: string; expires_in?: number };
    kickToken = d.access_token || "";
    kickTokenExp = Date.now() + ((d.expires_in || 3600) - 120) * 1000;
    return kickToken;
  } catch {
    return "";
  }
}

function fromCache(out: Record<string, number>, slugs: string[]) {
  for (const s of slugs) {
    const key = s.toLowerCase();
    const c = kickCache.get(key);
    if (c && Date.now() - c.at < KICK_STALE_MS) out[key] = c.viewers;
  }
}

export async function getKickViewers(slugs: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (slugs.length === 0) return out;

  const token = await kickAppToken();
  if (!token) {
    fromCache(out, slugs);
    return out;
  }

  const qs = slugs.map((s) => `slug=${encodeURIComponent(s.toLowerCase())}`).join("&");
  try {
    const res = await fetch(`https://api.kick.com/public/v1/channels?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) {
      fromCache(out, slugs);
      return out;
    }
    const d = (await res.json()) as {
      data?: Array<{ slug?: string; stream?: { is_live?: boolean; viewer_count?: number } | null }>;
    };
    const seen = new Set<string>();
    for (const ch of d.data || []) {
      const key = (ch.slug || "").toLowerCase();
      if (!key) continue;
      seen.add(key);
      if (ch.stream && ch.stream.is_live) {
        const v = ch.stream.viewer_count || 0;
        out[key] = v;
        kickCache.set(key, { viewers: v, at: Date.now() });
      } else {
        kickCache.delete(key);
      }
    }
    for (const s of slugs) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        const c = kickCache.get(key);
        if (c && Date.now() - c.at < KICK_STALE_MS) out[key] = c.viewers;
      }
    }
    return out;
  } catch {
    fromCache(out, slugs);
    return out;
  }
}
