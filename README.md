# Market Bubble — Live Dashboard

A custom watch page for the Market Bubble show: live video plus one unified chat
aggregated across Twitch, Kick and X, with deep viewer-side filtering.

## Stack

Mirrors the rune-landing setup:

- Next.js 15 (App Router) + React 19 + TypeScript
- Chakra UI v2 + Emotion
- Framer Motion
- Supabase (`@supabase/ssr`, `supabase-js`) — used for realtime fan-out
- Deployed on Vercel

## Run

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The dashboard currently runs on a built-in mock chat feed so the UI is fully
demoable before the ingestion worker is wired up.

## Architecture (planned)

```
Twitch IRC  ─┐
Kick Pusher ─┤→  ingestion worker  →  normalized ChatMessage  →  fan-out  →  browsers
X (demo)    ─┘   (always-on, ~$5/mo)                            (Supabase Realtime)
```

- The browser never connects to the platforms directly. One worker holds the
  ~6 upstream connections, normalizes every message into `ChatMessage`
  (`src/lib/chat/types.ts`), and broadcasts to all viewers.
- Frontend (Vercel) subscribes to a single realtime channel. Ephemeral chat uses
  Supabase Realtime *Broadcast* (no DB writes, no DB cost).
- The fan-out layer is intentionally swappable (Supabase Realtime → Cloudflare
  Durable Objects) without touching the worker or the frontend.

### Platform reality

- **Twitch** — free, real-time via anonymous IRC-over-WebSocket (justinfan).
- **Kick** — free, real-time via the public Pusher WebSocket (`ChatMessageEvent`).
- **X** — no supported API for live broadcast chat, so it runs as a labeled
  simulated source for now. It's a pluggable adapter (`worker/src/x.ts`); swap in a
  real connector later and nothing else changes.

The worker lives in `worker/` and is documented in `worker/README.md`. Run the
frontend on the built-in mock feed (no setup) or point both at the same Supabase
channel to go live.

## Layout

```
src/
  app/            layout, providers, page (the watch dashboard)
  components/     TopBar, VideoStage, TickerBar, ChatPanel, Logo
  lib/
    chat/         types (normalized schema), mock feed, useChatFeed hook
    tickers.ts    cashtag / price strip data
    supabase.ts   realtime client
    chat/realtime.ts  Supabase Realtime subscriber (mock fallback)
  theme/          colors + Chakra tokens (brand palette)
worker/           ingestion service (Twitch + Kick + demo X → Supabase Realtime)
```
