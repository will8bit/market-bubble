"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const WORKER = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/+$/, "");

export type Provider = "twitch" | "kick";

export interface LinkedAccount {
  username: string;
  displayName: string;
  avatar: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
  results?: { platform: string; streamer: string; ok: boolean; error?: string }[];
}

export interface SendTarget {
  platform: Provider;
  streamer: string;
}

interface AuthState {
  twitch: LinkedAccount | null;
  kick: LinkedAccount | null;
  admin: boolean;
  ready: boolean;
  enabled: boolean;
  login: (provider: Provider) => void;
  unlink: (provider: Provider) => void;
  logout: () => void;
  send: (targets: SendTarget[], message: string) => Promise<SendResult>;
}

const Context = createContext<AuthState>({
  twitch: null,
  kick: null,
  admin: false,
  ready: false,
  enabled: false,
  login: () => {},
  unlink: () => {},
  logout: () => {},
  send: async () => ({ ok: false, error: "not ready" }),
});

const STORAGE_KEY = "mb-session";

function getSession(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [twitch, setTwitch] = useState<LinkedAccount | null>(null);
  const [kick, setKick] = useState<LinkedAccount | null>(null);
  const [admin, setAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!WORKER) {
      setReady(true);
      return;
    }
    const session = getSession();
    if (!session) {
      setTwitch(null);
      setKick(null);
      setAdmin(false);
      setReady(true);
      return;
    }
    try {
      const res = await fetch(`${WORKER}/auth/me`, {
        headers: { authorization: `Bearer ${session}` },
      });
      if (res.ok) {
        const d = (await res.json()) as {
          twitch: LinkedAccount | null;
          kick: LinkedAccount | null;
          admin?: boolean;
        };
        setTwitch(d.twitch);
        setKick(d.kick);
        setAdmin(Boolean(d.admin));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const incoming = params.get("mb_session");
      if (incoming) {
        localStorage.setItem(STORAGE_KEY, incoming);
        params.delete("mb_session");
        params.delete("mb_error");
        const qs = params.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (qs ? `?${qs}` : "")
        );
      }
    } catch {}
    refresh();
  }, [refresh]);

  const login = useCallback((provider: Provider) => {
    if (!WORKER) return;
    const session = getSession();
    const q = session ? `?session=${encodeURIComponent(session)}` : "";
    window.location.href = `${WORKER}/auth/${provider}${q}`;
  }, []);

  const unlink = useCallback(
    async (provider: Provider) => {
      if (!WORKER) return;
      const session = getSession();
      if (!session) return;
      try {
        await fetch(`${WORKER}/auth/unlink?provider=${provider}`, {
          method: "POST",
          headers: { authorization: `Bearer ${session}` },
        });
      } catch {}
      refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    if (WORKER) {
      const session = getSession();
      if (session) {
        try {
          await fetch(`${WORKER}/auth/logout`, {
            method: "POST",
            headers: { authorization: `Bearer ${session}` },
          });
        } catch {}
      }
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setTwitch(null);
    setKick(null);
    setAdmin(false);
  }, []);

  const send = useCallback(
    async (targets: SendTarget[], message: string): Promise<SendResult> => {
      if (!WORKER) return { ok: false, error: "not configured" };
      const session = getSession();
      if (!session) return { ok: false, error: "not signed in" };
      try {
        const res = await fetch(`${WORKER}/chat/send`, {
          method: "POST",
          headers: { authorization: `Bearer ${session}`, "content-type": "application/json" },
          body: JSON.stringify({ targets, message }),
        });
        const d = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          results?: { platform: string; streamer: string; ok: boolean; error?: string }[];
        };
        if (!res.ok || d.ok === false) {
          const firstErr = d.results?.find((r) => !r.ok)?.error;
          return { ok: false, error: d.error || firstErr || `failed (${res.status})`, results: d.results };
        }
        return { ok: true, results: d.results };
      } catch {
        return { ok: false, error: "network error" };
      }
    },
    []
  );

  return (
    <Context.Provider
      value={{ twitch, kick, admin, ready, enabled: Boolean(WORKER), login, unlink, logout, send }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  return useContext(Context);
}
