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

export async function getKickViewers(slugs: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const slug of slugs) {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
        headers: { "User-Agent": UA, accept: "application/json" },
      });
      if (!res.ok) continue;
      const d = (await res.json()) as { livestream?: { is_live?: boolean; viewer_count?: number } | null };
      if (d.livestream && d.livestream.is_live) {
        out[slug.toLowerCase()] = d.livestream.viewer_count || 0;
      }
    } catch {}
  }
  return out;
}
