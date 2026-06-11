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
  url: string;
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
      slug?: string;
      events?: Array<{ id?: string; slug?: string }>;
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
        const slug = m.events?.[0]?.slug || m.slug || "";
        const url = slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com";
        out.push({ question: m.question, yes, no, endDate: m.endDate || "", url });
      } catch {}
      if (out.length >= 5) break;
    }
    return out;
  } catch {
    return [];
  }
}
