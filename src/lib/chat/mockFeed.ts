import { ChatMessage, Platform, StreamerId, Badge, extractCashtags } from "./types";

const PLATFORMS: Platform[] = ["twitch", "kick", "x"];
const STREAMER_IDS: StreamerId[] = ["banks", "ansem"];

const NAMES = [
  "degenmax", "soltrader", "btcmaxi", "wensol", "gmfren", "liquidated_again",
  "0xWhale", "paperhands22", "fadethejeet", "ansemfan", "marketwizard", "rugpull_survivor",
  "hopium_addict", "exit_liquidity", "ngmi_andy", "wagmi_wendy", "candlewatcher",
  "shorting_tops", "buyhighsell_low", "tickergod", "moonboi", "bagholder_ben",
];

const COLORS = [
  "#ff6b6b", "#4dabf7", "#51cf66", "#ffd43b", "#cc5de8", "#22b8cf",
  "#ff922b", "#94d82d", "#f783ac", "#74c0fc", "#ffa94d", "#63e6be",
];

const MESSAGES = [
  "$BTC about to send it",
  "no way $SOL holds this level",
  "ansem was right again, never fade",
  "this $HYPE chart is insane",
  "who else is in $ZEC",
  "Polymarket odds shifting fast",
  "GM market bubble fam",
  "$VVV looking primed",
  "im so liquidated rn",
  "buy the dip or buy the rip?",
  "banks cooking with this take",
  "lmao the spread on portfolio 2",
  "+103% are you serious",
  "this is financial advice (its not)",
  "chat what do we think about $SOL here",
  "the AI play is the only play",
  "command attention fr",
  "invest in yourself",
  "thursday 1pm never miss it",
  "real ones know",
  "$BTC $SOL $HYPE all green today",
  "i need this clip",
  "W stream",
  "L take from chat lol",
  "wen new portfolio update",
];

const BADGES_POOL: Badge[][] = [
  [],
  [{ type: "subscriber", label: "Sub" }],
  [{ type: "vip", label: "VIP" }],
  [{ type: "moderator", label: "Mod" }],
  [{ type: "verified", label: "Verified" }],
  [{ type: "og", label: "OG" }],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let counter = 0;

function makeMessage(): ChatMessage {
  const platform = pick(PLATFORMS);
  const streamer = pick(STREAMER_IDS);
  const text = pick(MESSAGES);
  const badges = pick(BADGES_POOL);
  const isMod = badges.some((b) => b.type === "moderator");
  const isSub = badges.some((b) => b.type === "subscriber");
  counter += 1;

  return {
    id: `mock-${Date.now()}-${counter}`,
    platform,
    streamer,
    author: {
      name: pick(NAMES),
      color: pick(COLORS),
      badges,
    },
    text,
    cashtags: extractCashtags(text),
    isMod,
    isSub,
    isBroadcaster: false,
    timestamp: Date.now(),
  };
}

export function seedMessages(n: number): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i < n; i += 1) out.push(makeMessage());
  return out;
}

export function createMockFeed(onMessage: (msg: ChatMessage) => void): () => void {
  let active = true;

  function tick() {
    if (!active) return;
    onMessage(makeMessage());
    const delay = 800 + Math.random() * 1500;
    setTimeout(tick, delay);
  }

  const handle = setTimeout(tick, 600);
  return () => {
    active = false;
    clearTimeout(handle);
  };
}
