# Market Bubble — Ingestion Worker

Always-on Node service that holds the upstream chat connections, normalizes every
message into the shared `ChatMessage` schema, and broadcasts batches to a Supabase
Realtime channel. The Next.js frontend subscribes to that one channel.

```
Twitch IRC (anonymous)  ─┐
Kick Pusher (public)     ─┤→  normalize  →  batched broadcast  →  Supabase Realtime
X (simulated demo)       ─┘
```

## Setup

```bash
cd worker
npm install
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and the channel handles
npm run dev
```

Without Supabase credentials the worker runs in dry-run mode and logs messages to
the console, so you can confirm Twitch/Kick connectivity before wiring Supabase.

## Configuration

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Realtime broadcast target |
| `CHAT_CHANNEL` | Realtime channel name (must match `NEXT_PUBLIC_CHAT_CHANNEL`) |
| `BANKS_TWITCH`, `ANSEM_TWITCH` | Twitch channel logins |
| `BANKS_KICK`, `ANSEM_KICK` | Kick channel slugs |
| `*_KICK_CHATROOM_ID` | Optional. Set if Kick's channel API is Cloudflare-blocked from your host |
| `ENABLE_DEMO_X` | `true` to run the simulated X source |

## Notes per platform

- **Twitch** — anonymous IRC (`justinfan`), reads tags for name/color/badges. Free.
- **Kick** — public Pusher app, subscribes to `chatrooms.{id}.v2`. The chatroom id is
  fetched from `kick.com/api/v2/channels/{slug}`; if that 403s from a datacenter IP,
  set `*_KICK_CHATROOM_ID` directly. Free.
- **X** — simulated source for now. Real X live-broadcast chat has no supported API;
  replace `src/x.ts` when a connector is ready — nothing else changes.

## Deploy

Any always-on host works (it is not serverless). Railway or Fly.io are simplest:
push the `worker/` folder, set the env vars, run `npm start`. One small instance
handles the upstream connections for the whole audience; viewer fan-out is Supabase's
job, so this stays cheap as concurrency grows.
