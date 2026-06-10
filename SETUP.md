# Going live — Twitch, Kick, X

## How it works

```
Twitch + Kick ─► each viewer's browser connects directly (free fan-out)
X            ─► worker reads it ─► worker WebSocket ─► viewers
backfill     ─► worker sends the last ~50 (all sources) on connect
```

- **Twitch & Kick are browser-direct.** Every viewer connects straight to Twitch
  (anonymous IRC) and Kick (Pusher) — no server in the middle, free at any scale.
- **X runs on the worker.** X needs guest-token auth a browser can't do, so the
  worker reads X and fans it out over its own WebSocket. The worker also reads
  Twitch/Kick only to include them in the join-time backfill.
- **No Supabase.** Fan-out and backfill are handled by the worker's WebSocket, so
  there's no per-connection database bill — one small worker box serves everyone.

The site works with **no worker at all** (Twitch + Kick browser-direct, no X, no
backfill). Run the worker to add X and backfill.

## 1. Channels (frontend) — `src/lib/chat/channels.ts`

```ts
export const CHANNELS: ChannelConfig[] = [
  { id: "banks", twitch: "clix", kick: { slug: "solomission", chatroomId: 2218947 } },
  { id: "ansem" },
];
```

- `twitch` = the login after `twitch.tv/`.
- `kick.chatroomId` = from `kick.com/api/v2/channels/<slug>` → `chatroom.id`.

Run the frontend and toggle **DEMO off** — Twitch + Kick chat work with nothing else.

## 2. Worker (for X + backfill) — `worker/.env`

```
PORT=8080

BANKS_TWITCH=clix
BANKS_KICK=solomission
BANKS_KICK_CHATROOM_ID=2218947

BANKS_X_BROADCAST=https://x.com/i/broadcasts/<id>
```

- `*_TWITCH` / `*_KICK` are only used to populate backfill (their live feed is
  browser-direct). Omit them if you don't want Twitch/Kick history on join.
- `*_X_BROADCAST` is the X broadcast URL or id — set per show (the id changes each
  stream). Uses X's internal endpoints (no login, free) — ToS-gray, best-effort.

Run it:

```bash
cd worker
npm install
npm run dev
```

Watch for `[fanout] websocket server listening on :8080`, `[twitch] joined …`,
`[kick] subscribed …`, and `[x] connected to broadcast …`.

## 3. Point the frontend at the worker — `/.env.local`

```
NEXT_PUBLIC_X_WS_URL=ws://localhost:8080
```

Restart `npm run dev` after editing. With DEMO off, the browser connects to the
worker for backfill + live X, and to Twitch/Kick directly. Without this var, you
just get Twitch + Kick (no X, no backfill).

## 4. Deploy

- Frontend → Vercel.
- Worker → any always-on host (Railway/Fly). It must be reachable over **wss://**
  (those platforms terminate TLS for you). Set `NEXT_PUBLIC_X_WS_URL=wss://<your-worker-host>`
  in Vercel.
- One small worker box holds tens of thousands of idle viewer connections (X is
  low-volume). Past that, scale the box up or move fan-out to Cloudflare Durable
  Objects.

## Later

- **Chat back** — viewers logging in (Twitch/Kick OAuth) and posting from the
  dashboard via a serverless send endpoint. Sits on top of auth.
