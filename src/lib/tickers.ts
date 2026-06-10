export interface Ticker {
  symbol: string;
  price: string;
  change: number;
}

export const TICKERS: Ticker[] = [
  { symbol: "BTC", price: "$104,820", change: 2.4 },
  { symbol: "SOL", price: "$241.18", change: -1.6 },
  { symbol: "HYPE", price: "$38.92", change: 8.1 },
  { symbol: "ZEC", price: "$61.40", change: 4.7 },
  { symbol: "VVV", price: "$12.07", change: -3.2 },
];
