"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { subscribeWorker } from "./workerSocket";

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  spark: number[];
}

export interface Stats {
  viewers: {
    twitch: number | null;
    kick: number | null;
    total: number;
    site: number;
    peak: number;
    twitchStartedAt: string | null;
    streamers: {
      id: string;
      name: string;
      twitch: number | null;
      kick: number | null;
      total: number;
    }[];
  };
  markets: {
    crypto: MarketQuote[];
    stocks: MarketQuote[];
    commodities: MarketQuote[];
    polymarket: { question: string; yes: number; no: number; endDate: string }[];
  };
}

const Context = createContext<Stats | null>(null);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const unsub = subscribeWorker((frame) => {
      if (frame.t === "stats") setStats(frame.stats as Stats);
    });
    return unsub;
  }, []);

  return <Context.Provider value={stats}>{children}</Context.Provider>;
}

export function useStats() {
  return useContext(Context);
}
