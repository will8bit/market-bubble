const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  spark: number[];
}

export interface PolyMarket {
  question: string;
  yes: number;
  no: number;
  endDate: string;
}

const STABLES = new Set(["usdt", "usdc", "dai", "busd", "tusd", "usds", "fdusd", "usde"]);

export async function getCrypto(): Promise<MarketQuote[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=true&price_change_percentage=24h"
    );
    if (!res.ok) return [];
    const list = (await res.json()) as Array<{
      symbol?: string;
      current_price?: number;
      price_change_percentage_24h?: number;
      sparkline_in_7d?: { price?: number[] };
    }>;
    const out: MarketQuote[] = [];
    for (const c of Array.isArray(list) ? list : []) {
      const sym = (c.symbol || "").toLowerCase();
      if (!sym || STABLES.has(sym)) continue;
      out.push({
        symbol: sym.toUpperCase(),
        price: c.current_price || 0,
        change: c.price_change_percentage_24h || 0,
        spark: (c.sparkline_in_7d?.price || []).slice(-24),
      });
      if (out.length >= 4) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function getYahoo(symbol: string, display: string): Promise<MarketQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=5m`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const r = d.chart?.result?.[0];
    if (!r || !r.meta) return null;
    const price = Number(r.meta.regularMarketPrice);
    const prev = Number(r.meta.chartPreviousClose ?? r.meta.previousClose);
    if (!Number.isFinite(price)) return null;
    const closes = (r.indicators?.quote?.[0]?.close || []).filter(
      (x): x is number => typeof x === "number"
    );
    const change = Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : 0;
    return { symbol: display, price, change, spark: closes.slice(-60) };
  } catch {
    return null;
  }
}

const STOCKS: { s: string; n: string }[] = [
  { s: "^GSPC", n: "S&P 500" },
  { s: "^IXIC", n: "Nasdaq" },
  { s: "^DJI", n: "Dow Jones" },
  { s: "^RUT", n: "Russell 2K" },
];

const COMMODITIES: { s: string; n: string }[] = [
  { s: "GC=F", n: "Gold" },
  { s: "SI=F", n: "Silver" },
  { s: "CL=F", n: "Crude Oil" },
  { s: "NG=F", n: "Nat Gas" },
];

export async function getStocks(): Promise<MarketQuote[]> {
  const r = await Promise.all(STOCKS.map((x) => getYahoo(x.s, x.n)));
  return r.filter((x): x is MarketQuote => x != null);
}

export async function getCommodities(): Promise<MarketQuote[]> {
  const r = await Promise.all(COMMODITIES.map((x) => getYahoo(x.s, x.n)));
  return r.filter((x): x is MarketQuote => x != null);
}

export async function getPolymarket(): Promise<PolyMarket[]> {
  try {
    const res = await fetch(
      "https://gamma-api.polymarket.com/markets?closed=false&active=true&order=volume24hr&ascending=false&limit=100"
    );
    if (!res.ok) return [];
    const list = (await res.json()) as Array<{
      question?: string;
      outcomes?: string;
      outcomePrices?: string;
      endDate?: string;
      negRisk?: boolean;
      events?: Array<{ id?: string }>;
    }>;
    const out: PolyMarket[] = [];
    const seenEvents = new Set<string>();
    for (const m of Array.isArray(list) ? list : []) {
      if (!m.question || !m.outcomes || !m.outcomePrices) continue;
      if (m.negRisk) continue;
      try {
        const outcomes = JSON.parse(m.outcomes) as string[];
        const prices = JSON.parse(m.outcomePrices) as string[];
        const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
        const idx = yesIdx >= 0 ? yesIdx : 0;
        const noIdx = idx === 0 ? 1 : 0;
        const yes = Number(prices[idx]);
        if (!(yes >= 0.1 && yes <= 0.9)) continue;
        const eventId = m.events?.[0]?.id;
        if (eventId) {
          if (seenEvents.has(eventId)) continue;
          seenEvents.add(eventId);
        }
        const no = prices[noIdx] != null ? Number(prices[noIdx]) : 1 - yes;
        out.push({ question: m.question, yes, no, endDate: m.endDate || "" });
      } catch {}
      if (out.length >= 5) break;
    }
    return out;
  } catch {
    return [];
  }
}
