# Market Bubble

**One watch page for a multi-platform live show.** Market Bubble unifies the Twitch, Kick, and X chat for Banks & Ansem's markets show into a single, branded dashboard — with live viewer stats, a real-time markets ticker, a two-tier layout for casual and power viewers, and a secure admin control room for the hosts.

Built for the Vibe Code Challenge.

---

## What it does

**Unified live chat.** Twitch, Kick, and X messages stream into one feed, each tagged by platform and host. Read every channel at once in a "Global" view, or filter down to any combination of platform (Twitch / Kick / X) and streamer (Banks / Ansem). Full-text search, cashtag filtering, command hiding, and per-message detail on hover.

**Chat back to every channel at once.** Sign in with Twitch and/or Kick and send a single message that fans out to all your channels simultaneously. Sent messages are de-duplicated across platforms so your own multi-channel post shows up once, marked as global.

**Two layouts, one toggle.**
- **Simple** — the stream, the show info, and chat. Clean and focused.
- **Pro** — adds a live markets rail (crypto prices + Polymarket odds) and a real-time audience panel (per-platform viewer counts, Banks-vs-Ansem split, on-site count, and session peak), all on a scrollable stage.

**Live markets.** A crypto ticker bar and Polymarket odds update on an interval, pulled server-side so the browser stays light.

**Pop-out windows.** Pop the chat or the audience/feed-health panel into its own window for a second monitor. The main page detects what's popped out and shows a placeholder with "focus window" and "bring back" controls — synced live across windows.

**Polished details.** Warm light theme and a deep dark theme, an offline screen with a timezone-aware next-episode countdown, rolling-number animations, every preference persisted across reloads and windows, and traced-vector branding driven by `currentColor`.

---

## Admin control room (`/admin`)

A separate, secured dashboard for the hosts — access is computed **server-side** from a whitelist of Twitch usernames (`ADMIN_USERS`), never shipped to the browser, so it can't be spoofed.

- **Moderation** — live curation over the chat: questions queue, starred/saved messages, trending cashtags, top chatters, and a feed of every link posted. Saved items and a rolling message log persist locally, so the lists survive reloads instead of resetting.
- **Feed Health** — an at-a-glance monitor of each source (Twitch / Kick / X): live/slow/idle status, time since last message, viewer counts, a 60-second activity sparkline, and worker-link freshness.
- **Audience** — the full viewer breakdown plus uptime, messages/min, active chatters, and a chat-split bar.
- **Broadcast** — edit the on-site show title and subtitle and **Save** them globally for every viewer in real time, then optionally **push the title to the live Twitch and Kick channels** with one button each (works for whoever owns the channel and is signed in).
- A focused 50/50 stage (stream over audience) with no page scroll, and a Home button back to the public site.

> **Admin access:** the control room at `/admin` is restricted to whitelisted accounts. You must be **signed in with a whitelisted Twitch account** to use it — if you're not already logged in, sign in via the profile menu first, otherwise the page just shows "Not authorized".

---

## Live links

- **Site:** https://market-bubble-six.vercel.app/
- **Pop-out chat:** https://market-bubble-six.vercel.app/popout/marketbubble/chat?popout=
- **Pop-out audience + feed health:** https://market-bubble-six.vercel.app/popout/marketbubble/audience?popout=

The two pop-out URLs are standalone, self-contained views meant to be used **live during a stream** — drop them straight into an OBS / Streamlabs **Browser Source**, or just open them on a second monitor:

- **Pop-out chat** — the full unified Twitch + Kick + X chat in one window.
- **Pop-out audience** — the live viewer stats and feed-health monitor.

They stay in sync with the main site in real time, and while one is open the main dashboard shows a "popped out" placeholder so nothing is duplicated. The chat and audience panels also have a pop-out button in their headers that open these same URLs.

---

## Architecture

```
Browser ──reads chat directly──►  Twitch IRC (anon)  ·  Kick Pusher
   │
   └──WebSocket──►  Worker  ──►  backfill · X feed · viewer/markets/media stats · show config
                      │
                      └── HTTP: OAuth (Twitch / Kick) · /chat/send · /admin/*
```

- **Chat is read in the browser** over Twitch's anonymous IRC-over-WebSocket and Kick's public Pusher socket — instant, free, no key required.
- **The worker** (Node, `ws` + raw HTTP) holds the server-side connections, relays the X feed and a ~100-message backfill, and pushes a periodic **stats frame** (viewers, markets, media, show info) to every connected client over one WebSocket.
- **OAuth and privileged actions** run through the worker: Twitch (auth-code) and Kick (auth-code + PKCE) sign-in, sending chat, the admin show-info save, and the real channel-title updates. Tokens live only on the worker.
- The normalized message schema lives in `src/lib/chat/types.ts`; both the browser readers and the worker emit the same `ChatMessage`.

**Platform reality:** Twitch and Kick chat are real and live. X has no supported live-broadcast-chat API, so it runs as a clearly-labeled adapter (`worker/src/x.ts`) — swap in a real connector and nothing else changes.

---

## Tech

- **Next.js 15** (App Router) · **React 19** · **TypeScript** (strict)
- **Chakra UI v2** + Emotion, custom warm-cream / dark theme
- **Worker:** Node 22 (ESM), `ws` WebSocket server + raw HTTP
- **Deploy:** frontend on Vercel · worker on Railway

---

## Run locally

**Frontend**

```bash
npm install
echo "NEXT_PUBLIC_WORKER_URL=http://localhost:8080" > .env.local
npm run dev
```

**Worker** (separate terminal)

```bash
cd worker
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

### Worker environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Worker port (default 8080) |
| `APP_URL` | Frontend origin, for OAuth redirects + CORS |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` / `TWITCH_REDIRECT_URI` | Twitch OAuth |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` / `KICK_REDIRECT_URI` | Kick OAuth |
| `ADMIN_USERS` | Comma-separated Twitch usernames allowed into `/admin` |
| `SHOW_TITLE` / `SHOW_SUBTITLE` | Optional defaults for the on-site show info |

OAuth scopes requested: Twitch `user:write:chat channel:manage:broadcast`, Kick `chat:write user:read channel:write` — the broadcast scopes let signed-in channel owners update their live stream title from the admin Broadcast tab.

---

## Project layout

```
src/
  app/
    page.tsx              public watch page (Simple / Pro)
    admin/page.tsx        gated admin control room
    popout/[channel]/     stand-alone chat + audience windows
    providers.tsx         Chakra, auth, stats, show-config, settings, pro-mode
  components/
    VideoStage · ChatPanel · ChatComposer · ProPanels (markets + audience + feed health)
    AdminTools · TopBar · TickerBar · PoppedOut · Logo
  lib/
    chat/                 normalized types, browser Twitch/Kick clients, worker socket, stats
    auth.tsx              Twitch/Kick OAuth session (worker-backed)
    showConfig.tsx        global show-info (server-synced) + draft/save
    usePopout.ts          cross-window popout presence
    usePersistentState.ts localStorage state synced across windows
  theme/                  colors + Chakra tokens
worker/
  src/                    Twitch · Kick · X readers, viewers, markets, media, OAuth, admin API
```
