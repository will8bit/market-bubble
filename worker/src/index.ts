import "dotenv/config";
import { ChatMessage } from "./types";
import { STREAMERS, X_TARGETS } from "./config";
import { connectTwitch } from "./twitch";
import { connectKick } from "./kick";
import { connectX } from "./x";
import { createFanoutServer } from "./server";
import { getTwitchViewers, getKickViewers } from "./viewers";
import { getCrypto, getPolymarket, MarketQuote, PolyMarket } from "./markets";
import { getTwitchMedia, TwitchMedia } from "./media";

async function main() {
  const port = Number(process.env.PORT || 8080);
  const server = createFanoutServer(port);

  let chatTotal = 0;
  let peakTotal = 0;

  const onMessage = (msg: ChatMessage) => {
    chatTotal += 1;
    if (msg.platform === "x") server.broadcast(msg);
    else server.record(msg);
  };

  const stops: Array<() => void> = [];
  stops.push(connectTwitch(STREAMERS, onMessage));
  stops.push(await connectKick(STREAMERS, onMessage));
  stops.push(connectX(X_TARGETS, onMessage));

  const twitchLogins = STREAMERS.map((s) => s.twitch).filter((v): v is string => Boolean(v));
  const kickSlugs = STREAMERS.map((s) => s.kick).filter((v): v is string => Boolean(v));

  let crypto: MarketQuote[] = await getCrypto();
  let poly: PolyMarket[] = await getPolymarket();
  let media: TwitchMedia = await getTwitchMedia(STREAMERS);

  async function pushStats() {
    const [twitchMap, kickMap] = await Promise.all([
      getTwitchViewers(twitchLogins),
      getKickViewers(kickSlugs),
    ]);

    const streamers = STREAMERS.map((s) => {
      const twInfo = s.twitch ? twitchMap[s.twitch.toLowerCase()] : undefined;
      const tw = twInfo ? twInfo.viewers : null;
      const ki = s.kick ? kickMap[s.kick.toLowerCase()] ?? null : null;
      return { id: s.id, name: s.displayName, twitch: tw, kick: ki, total: (tw || 0) + (ki || 0) };
    });

    const banksCfg = STREAMERS.find((s) => s.id === "banks");
    const twitchStartedAt =
      banksCfg?.twitch ? twitchMap[banksCfg.twitch.toLowerCase()]?.startedAt ?? null : null;

    const sumOrNull = (vals: Array<number | null>) => {
      const live = vals.filter((v): v is number => v != null);
      return live.length ? live.reduce((a, b) => a + b, 0) : null;
    };
    const twitch = sumOrNull(streamers.map((s) => s.twitch));
    const kick = sumOrNull(streamers.map((s) => s.kick));
    const total = (twitch || 0) + (kick || 0);
    if (total > peakTotal) peakTotal = total;

    server.pushStats({
      viewers: {
        twitch,
        kick,
        total,
        site: server.clientCount(),
        peak: peakTotal,
        streamers,
        twitchStartedAt,
      },
      markets: { crypto, polymarket: poly },
      media,
    });
  }

  await pushStats();
  const statsTimer = setInterval(pushStats, 30000);
  const marketTimer = setInterval(async () => {
    [crypto, poly] = await Promise.all([getCrypto(), getPolymarket()]);
  }, 45000);
  const mediaTimer = setInterval(async () => {
    media = await getTwitchMedia(STREAMERS);
  }, 900000);

  if (X_TARGETS.length === 0) {
    console.warn("[worker] no X broadcasts configured (BANKS_X_BROADCAST / ANSEM_X_BROADCAST)");
  }

  setInterval(
    () => console.log(`[worker] ${chatTotal} messages · ${server.clientCount()} viewers connected`),
    30000
  );

  const shutdown = () => {
    console.log("[worker] shutting down");
    for (const stop of stops) stop();
    clearInterval(statsTimer);
    clearInterval(marketTimer);
    clearInterval(mediaTimer);
    server.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[worker] running");
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
