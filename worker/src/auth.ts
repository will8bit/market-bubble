import { randomBytes, createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { STREAMERS } from "./config";

type Provider = "twitch" | "kick";

interface SendResult {
  ok: boolean;
  error?: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface Account {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Session {
  id: string;
  twitch?: Account;
  kick?: Account;
}

const sessions = new Map<string, Session>();
const pending = new Map<
  string,
  { provider: Provider; sessionId?: string; verifier?: string; createdAt: number }
>();

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

function env(name: string): string {
  return process.env[name] || "";
}

function rand(bytes = 24): string {
  return randomBytes(bytes).toString("hex");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function cleanupPending() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of pending) if (v.createdAt < cutoff) pending.delete(k);
}

function ensureSession(sessionId?: string): Session {
  if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId)!;
  const id = rand();
  const s: Session = { id };
  sessions.set(id, s);
  return s;
}

function getSessionId(req: IncomingMessage, url: URL): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return url.searchParams.get("s");
}

export function getSession(req: IncomingMessage): Session | undefined {
  const url = new URL(req.url || "/", "http://localhost");
  const id = getSessionId(req, url);
  return id ? sessions.get(id) : undefined;
}

function cors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", APP_URL);
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function json(res: ServerResponse, status: number, body: unknown) {
  cors(res);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function redirect(res: ServerResponse, location: string) {
  res.writeHead(302, { location });
  res.end();
}

function backToApp(res: ServerResponse, sessionId?: string, error?: string) {
  const q = new URLSearchParams();
  if (sessionId) q.set("mb_session", sessionId);
  if (error) q.set("mb_error", error);
  redirect(res, `${APP_URL}/?${q.toString()}`);
}

function publicAccount(a?: Account) {
  if (!a) return null;
  return { username: a.username, displayName: a.displayName, avatar: a.avatar };
}

async function startTwitch(res: ServerResponse, sessionId?: string) {
  const state = rand();
  pending.set(state, { provider: "twitch", sessionId, createdAt: Date.now() });
  const p = new URLSearchParams({
    client_id: env("TWITCH_CLIENT_ID"),
    redirect_uri: env("TWITCH_REDIRECT_URI"),
    response_type: "code",
    scope: "user:write:chat",
    state,
  });
  redirect(res, `https://id.twitch.tv/oauth2/authorize?${p.toString()}`);
}

async function callbackTwitch(res: ServerResponse, url: URL) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const pend = pending.get(state);
  pending.delete(state);
  if (!code || !pend) return backToApp(res, undefined, "twitch_state");
  try {
    const tokRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env("TWITCH_CLIENT_ID"),
        client_secret: env("TWITCH_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: env("TWITCH_REDIRECT_URI"),
      }),
    });
    if (!tokRes.ok) return backToApp(res, pend.sessionId, "twitch_token");
    const tok = (await tokRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-Id": env("TWITCH_CLIENT_ID"),
        authorization: `Bearer ${tok.access_token}`,
      },
    });
    if (!userRes.ok) return backToApp(res, pend.sessionId, "twitch_user");
    const u = (await userRes.json()) as {
      data?: Array<{ id?: string; login?: string; display_name?: string; profile_image_url?: string }>;
    };
    const info = u.data?.[0];
    if (!info?.id) return backToApp(res, pend.sessionId, "twitch_user");
    const session = ensureSession(pend.sessionId);
    session.twitch = {
      userId: info.id,
      username: info.login || "",
      displayName: info.display_name || info.login || "",
      avatar: info.profile_image_url || "",
      accessToken: tok.access_token || "",
      refreshToken: tok.refresh_token || "",
      expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
    };
    backToApp(res, session.id);
  } catch {
    backToApp(res, pend.sessionId, "twitch_error");
  }
}

async function startKick(res: ServerResponse, sessionId?: string) {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = rand();
  pending.set(state, { provider: "kick", sessionId, verifier, createdAt: Date.now() });
  const p = new URLSearchParams({
    client_id: env("KICK_CLIENT_ID"),
    redirect_uri: env("KICK_REDIRECT_URI"),
    response_type: "code",
    scope: "chat:write user:read",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  redirect(res, `https://id.kick.com/oauth/authorize?${p.toString()}`);
}

async function callbackKick(res: ServerResponse, url: URL) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const pend = pending.get(state);
  pending.delete(state);
  if (!code || !pend || !pend.verifier) return backToApp(res, undefined, "kick_state");
  try {
    const tokRes = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env("KICK_CLIENT_ID"),
        client_secret: env("KICK_CLIENT_SECRET"),
        redirect_uri: env("KICK_REDIRECT_URI"),
        code_verifier: pend.verifier,
        code,
      }),
    });
    if (!tokRes.ok) return backToApp(res, pend.sessionId, "kick_token");
    const tok = (await tokRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const userRes = await fetch("https://api.kick.com/public/v1/users", {
      headers: { authorization: `Bearer ${tok.access_token}`, accept: "application/json" },
    });
    if (!userRes.ok) return backToApp(res, pend.sessionId, "kick_user");
    const u = (await userRes.json()) as {
      data?: Array<{ user_id?: number; name?: string; profile_picture?: string }>;
    };
    const info = u.data?.[0];
    if (!info?.user_id) return backToApp(res, pend.sessionId, "kick_user");
    const session = ensureSession(pend.sessionId);
    session.kick = {
      userId: String(info.user_id),
      username: info.name || "",
      displayName: info.name || "",
      avatar: info.profile_picture || "",
      accessToken: tok.access_token || "",
      refreshToken: tok.refresh_token || "",
      expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
    };
    backToApp(res, session.id);
  } catch {
    backToApp(res, pend.sessionId, "kick_error");
  }
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

async function refreshAccount(provider: Provider, a: Account): Promise<boolean> {
  const url = provider === "twitch" ? "https://id.twitch.tv/oauth2/token" : "https://id.kick.com/oauth/token";
  const clientId = provider === "twitch" ? env("TWITCH_CLIENT_ID") : env("KICK_CLIENT_ID");
  const clientSecret = provider === "twitch" ? env("TWITCH_CLIENT_SECRET") : env("KICK_CLIENT_SECRET");
  if (!a.refreshToken) return false;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: a.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!r.ok) return false;
    const t = (await r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!t.access_token) return false;
    a.accessToken = t.access_token;
    if (t.refresh_token) a.refreshToken = t.refresh_token;
    a.expiresAt = Date.now() + (t.expires_in || 3600) * 1000;
    return true;
  } catch {
    return false;
  }
}

async function ensureFresh(provider: Provider, a: Account): Promise<boolean> {
  if (Date.now() < a.expiresAt - 60000) return true;
  return refreshAccount(provider, a);
}

const twitchIds = new Map<string, string>();
const kickIds = new Map<string, number>();

async function twitchBroadcasterId(login: string, token: string): Promise<string | null> {
  const key = login.toLowerCase();
  if (twitchIds.has(key)) return twitchIds.get(key)!;
  try {
    const r = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(key)}`, {
      headers: { "Client-Id": env("TWITCH_CLIENT_ID"), authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { data?: Array<{ id?: string }> };
    const id = d.data?.[0]?.id;
    if (id) {
      twitchIds.set(key, id);
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

async function kickBroadcasterId(slug: string): Promise<number | null> {
  const key = slug.toLowerCase();
  if (kickIds.has(key)) return kickIds.get(key)!;
  try {
    const r = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(key)}`, {
      headers: { "User-Agent": UA, accept: "application/json" },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { user_id?: number };
    if (typeof d.user_id === "number") {
      kickIds.set(key, d.user_id);
      return d.user_id;
    }
    return null;
  } catch {
    return null;
  }
}

async function sendTwitch(account: Account, login: string, message: string): Promise<SendResult> {
  const broadcasterId = await twitchBroadcasterId(login, account.accessToken);
  if (!broadcasterId) return { ok: false, error: "channel not found" };
  try {
    const r = await fetch("https://api.twitch.tv/helix/chat/messages", {
      method: "POST",
      headers: {
        "Client-Id": env("TWITCH_CLIENT_ID"),
        authorization: `Bearer ${account.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ broadcaster_id: broadcasterId, sender_id: account.userId, message }),
    });
    if (!r.ok) {
      const body = (await r.json().catch(() => null)) as { message?: string; error?: string } | null;
      const detail = body?.message || body?.error || `status ${r.status}`;
      if (r.status === 401) return { ok: false, error: `Twitch auth — reconnect (${detail})` };
      return { ok: false, error: `Twitch: ${detail}` };
    }
    const d = (await r.json().catch(() => null)) as {
      data?: Array<{ is_sent?: boolean; drop_reason?: { message?: string } | null }>;
    } | null;
    const item = d?.data?.[0];
    if (item && item.is_sent === false) {
      return { ok: false, error: item.drop_reason?.message || "Message was blocked" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Twitch send failed" };
  }
}

async function sendKick(account: Account, slug: string, message: string): Promise<SendResult> {
  const id = await kickBroadcasterId(slug);
  if (!id) return { ok: false, error: "channel not found" };
  try {
    const r = await fetch("https://api.kick.com/public/v1/chat", {
      method: "POST",
      headers: {
        authorization: `Bearer ${account.accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ broadcaster_user_id: id, content: message, type: "user" }),
    });
    if (!r.ok) {
      const body = (await r.json().catch(() => null)) as { message?: string; error?: string } | null;
      const detail = body?.message || body?.error || `status ${r.status}`;
      if (r.status === 401) return { ok: false, error: `Kick auth — reconnect (${detail})` };
      return { ok: false, error: `Kick: ${detail}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Kick send failed" };
  }
}

async function handleSend(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "method not allowed" });
    return;
  }
  const session = getSession(req);
  const body = await readJson(req);
  const platform = body.platform === "twitch" || body.platform === "kick" ? body.platform : null;
  const streamerId = typeof body.streamer === "string" ? body.streamer : "";
  const message = (typeof body.message === "string" ? body.message : "").trim();

  if (!session) return json(res, 401, { ok: false, error: "not signed in" });
  if (!platform) return json(res, 400, { ok: false, error: "bad platform" });
  if (!message) return json(res, 400, { ok: false, error: "empty message" });

  const account = session[platform];
  if (!account) return json(res, 400, { ok: false, error: `link ${platform} first` });

  const cfg = STREAMERS.find((s) => s.id === streamerId);
  if (!cfg) return json(res, 400, { ok: false, error: "unknown streamer" });

  const fresh = await ensureFresh(platform, account);
  if (!fresh) return json(res, 401, { ok: false, error: `${platform} session expired — reconnect` });

  let result: SendResult;
  if (platform === "twitch") {
    if (!cfg.twitch) return json(res, 400, { ok: false, error: "no Twitch channel for this streamer" });
    result = await sendTwitch(account, cfg.twitch, message);
  } else {
    if (!cfg.kick) return json(res, 400, { ok: false, error: "no Kick channel for this streamer" });
    result = await sendKick(account, cfg.kick, message);
  }
  json(res, result.ok ? 200 : 400, result);
}

export async function handleAuthRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://localhost");
  const path = url.pathname;
  if (!path.startsWith("/auth/") && path !== "/chat/send") return false;

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  if (path === "/chat/send") {
    await handleSend(req, res);
    return true;
  }

  cleanupPending();
  const sessionId = url.searchParams.get("session") || undefined;

  if (path === "/auth/twitch") {
    await startTwitch(res, sessionId);
    return true;
  }
  if (path === "/auth/twitch/callback") {
    await callbackTwitch(res, url);
    return true;
  }
  if (path === "/auth/kick") {
    await startKick(res, sessionId);
    return true;
  }
  if (path === "/auth/kick/callback") {
    await callbackKick(res, url);
    return true;
  }
  if (path === "/auth/me") {
    const s = getSession(req);
    json(res, 200, { twitch: publicAccount(s?.twitch), kick: publicAccount(s?.kick) });
    return true;
  }
  if (path === "/auth/unlink") {
    const s = getSession(req);
    const provider = url.searchParams.get("provider");
    if (s && (provider === "twitch" || provider === "kick")) delete s[provider];
    json(res, 200, { twitch: publicAccount(s?.twitch), kick: publicAccount(s?.kick) });
    return true;
  }
  if (path === "/auth/logout") {
    const id = getSessionId(req, url);
    if (id) sessions.delete(id);
    json(res, 200, { ok: true });
    return true;
  }

  json(res, 404, { error: "not found" });
  return true;
}
