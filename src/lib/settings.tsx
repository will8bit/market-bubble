"use client";

import { createContext, useContext, useState } from "react";

type MarketsTab = "polymarket" | "markets";

interface SettingsState {
  reduceMotion: boolean;
  goLiveNotify: boolean;
  marketsTab: MarketsTab;
  setReduceMotion: (v: boolean) => void;
  setGoLiveNotify: (v: boolean) => void;
  setMarketsTab: (v: MarketsTab) => void;
}

const Context = createContext<SettingsState>({
  reduceMotion: false,
  goLiveNotify: false,
  marketsTab: "polymarket",
  setReduceMotion: () => {},
  setGoLiveNotify: () => {},
  setMarketsTab: () => {},
});

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [reduceMotion, setReduceMotionState] = useState(() => read("mb-reduce-motion") === "true");
  const [goLiveNotify, setGoLiveNotifyState] = useState(() => read("mb-golive") === "true");
  const [marketsTab, setMarketsTabState] = useState<MarketsTab>(() => {
    const mt = read("mb-markets-tab");
    return mt === "markets" || mt === "polymarket" ? mt : "polymarket";
  });

  const setReduceMotion = (v: boolean) => {
    setReduceMotionState(v);
    write("mb-reduce-motion", String(v));
  };
  const setGoLiveNotify = (v: boolean) => {
    setGoLiveNotifyState(v);
    write("mb-golive", String(v));
  };
  const setMarketsTab = (v: MarketsTab) => {
    setMarketsTabState(v);
    write("mb-markets-tab", v);
  };

  return (
    <Context.Provider
      value={{
        reduceMotion,
        goLiveNotify,
        marketsTab,
        setReduceMotion,
        setGoLiveNotify,
        setMarketsTab,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useSettings() {
  return useContext(Context);
}
