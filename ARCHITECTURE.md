# Market Bubble — Architecture & Plan

A custom, single-show watch page: live video plus one unified chat aggregated
across Twitch, Kick and X, with deep viewer-side filtering and a markets-native
identity (tickers, cashtags, Polymarket).

## Who uses it

- **Anonymous viewers** — watch and read the merged chat, switch video source,
  and use every filter. No account required.
- **Logged-in viewers** — everything above, plus chatting back and preferences
  that sync across devices. Login is via **Twitch, Kick, or X** OAuth; a user can
  link more than one and choose where their messages go.
- **Banks & Ansem (admin role)** — the *same* dashboard with a role flag that
  unlocks admin powers to change site settings, and (later) moderation. The role
  exists from the start; the admin features are a later phase.

## How data flows

**Read path (everyone, including anonymous):**

```
Twitch IRC (anon)  ─┐
Kick Pusher        ─┤→  worker (always-on)  →  Supabase Realtime  →  browsers
X (demo for now)   ─┘   normalize + batch        (broadcast)
```

**Write path (logged-in only) — sending a chat message:**

```
browser  →  serverless function (uses the user's platform token)  →  Twitch / Kick API
```

**Auth, roles, preferences, admin:** all Supabase (Auth + Postgres + RLS).

### What runs where

| Component | Where | Why |
| --- | --- | --- |
| Frontend (watch page) | Vercel | Static/SSR, no persistent sockets |
| Reading chat (6 feeds) | Worker (Railway/Fly, ~$5/mo) | Serverless can't hold live sockets |
| Fan-out to viewers | Supabase Realtime | Cheap broadcast, scales to thousands |
| Auth / roles / prefs | Supabase | No custom auth server needed |
| Sending a message | Serverless function | Short authenticated request, not the worker |

The only always-on custom piece is the worker, and it does exactly one thing.

## Per-platform reality

| Platform | Read chat | Send chat | Notes |
| --- | --- | --- | --- |
| Twitch | Anonymous IRC, free | User OAuth (`chat:edit`) | Fully supported |
| Kick | Public Pusher, free | Official API (`chat:write`) | Cloudflare quirk on some endpoints |
| X | No live-chat API | Not possible | Demo source; login = identity/prefs only |

## Stack

Mirrors rune-landing: Next.js 15 (App Router) · React 19 · TypeScript · Chakra UI
v2 + Emotion · Framer Motion · Supabase · Vercel.

## Roadmap

- **Phase 0 — Foundation. ✅ Done.** Project scaffold, brand theme, watch-page UI
  (source switcher, ticker strip, unified chat with full filters), ingestion worker
  (Twitch + Kick reading, demo X), Supabase Realtime wiring with mock fallback.
- **Phase 1 — Accounts.** Supabase Auth: anonymous-by-default, login with
  Twitch / X (built-in) and Kick (custom OAuth); `profiles` table with a `role`
  column + RLS; preferences persisted and synced.
- **Phase 2 — Chat back.** Compose box; send to Twitch/Kick using the user's token
  via serverless functions; multi-account linking; X shown as read-only.
- **Phase 3 — Go live.** Real channel handles, a Supabase project, deploy the worker.
- **Phase 4 — Admin (later).** Streamer-only controls to change site settings, then
  moderation (dashboard-local first, optional platform relay), and an OBS overlay URL.
- **Phase 5 — Later.** Real X connector, Polymarket odds, analytics.
