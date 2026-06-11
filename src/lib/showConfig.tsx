"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useStats } from "./chat/StatsProvider";

export const DEFAULT_SHOW_TITLE = "Greg Osuri & Mayne: Market Bubble EP 4";
export const DEFAULT_SHOW_SUBTITLE = "THURSDAY 1PM PST · PRESENTED BY POLYMARKET";

const WORKER = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/+$/, "");

type Result = { ok: boolean; error?: string };
type Draft = { title: string; subtitle: string };

interface ShowState {
  title: string;
  subtitle: string;
  dirty: boolean;
  saving: boolean;
  setDraft: (patch: Partial<Draft>) => void;
  save: () => Promise<Result>;
  setStreamTitle: (platform: "twitch" | "kick") => Promise<Result>;
}

const Context = createContext<ShowState | null>(null);

function getSession(): string {
  try {
    return localStorage.getItem("mb-session") || "";
  } catch {
    return "";
  }
}

async function postAdmin(path: string, body: unknown): Promise<Result> {
  if (!WORKER) return { ok: false, error: "worker not configured" };
  const session = getSession();
  if (!session) return { ok: false, error: "not signed in" };
  try {
    const res = await fetch(`${WORKER}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${session}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || d.ok === false) return { ok: false, error: d.error || `failed (${res.status})` };
    return { ok: true };
  } catch {
    return { ok: false, error: "network error" };
  }
}

export function ShowProvider({ children }: { children: React.ReactNode }) {
  const stats = useStats();
  const serverTitle = stats?.show?.title ?? DEFAULT_SHOW_TITLE;
  const serverSubtitle = stats?.show?.subtitle ?? DEFAULT_SHOW_SUBTITLE;

  const [draft, setDraftState] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const title = draft?.title ?? serverTitle;
  const subtitle = draft?.subtitle ?? serverSubtitle;
  const dirty = draft != null && (draft.title !== serverTitle || draft.subtitle !== serverSubtitle);

  useEffect(() => {
    if (draft && draft.title === serverTitle && draft.subtitle === serverSubtitle) setDraftState(null);
  }, [draft, serverTitle, serverSubtitle]);

  const setDraft = useCallback(
    (patch: Partial<Draft>) => {
      setDraftState((prev) => {
        const base = prev ?? { title: serverTitle, subtitle: serverSubtitle };
        return { ...base, ...patch };
      });
    },
    [serverTitle, serverSubtitle]
  );

  const save = useCallback(async () => {
    setSaving(true);
    const r = await postAdmin("/admin/show", { title, subtitle });
    setSaving(false);
    return r;
  }, [title, subtitle]);

  const setStreamTitle = useCallback(
    (platform: "twitch" | "kick") => postAdmin("/admin/stream-title", { platform, title }),
    [title]
  );

  const value = useMemo<ShowState>(
    () => ({ title, subtitle, dirty, saving, setDraft, save, setStreamTitle }),
    [title, subtitle, dirty, saving, setDraft, save, setStreamTitle]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useShow(): ShowState {
  const ctx = useContext(Context);
  if (!ctx) {
    return {
      title: DEFAULT_SHOW_TITLE,
      subtitle: DEFAULT_SHOW_SUBTITLE,
      dirty: false,
      saving: false,
      setDraft: () => {},
      save: async () => ({ ok: false, error: "no provider" }),
      setStreamTitle: async () => ({ ok: false, error: "no provider" }),
    };
  }
  return ctx;
}
