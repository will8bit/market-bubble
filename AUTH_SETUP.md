# Sign-in setup (Twitch + Kick)

Users sign in with Twitch and/or Kick so they can chat into the live broadcasts.
The worker handles OAuth and holds tokens; the browser only keeps an opaque session id.

## 1. Decide your worker URL

Everything keys off where the worker runs.

- **Local dev:** `http://localhost:8080`
- **Deployed (recommended, see below):** e.g. `https://market-bubble-worker.up.railway.app`

Use that base URL in the redirect URIs and env below. You can register **both** a localhost
redirect and a deployed redirect on each app so dev and prod both work.

## 2. Twitch

You already have a Twitch app (it powers viewer counts). Reuse it.

1. Go to https://dev.twitch.tv/console/apps → open your app (or "Register Your Application").
2. Under **OAuth Redirect URLs**, add:
   - `http://localhost:8080/auth/twitch/callback`
   - `<YOUR_WORKER_URL>/auth/twitch/callback` (once deployed)
3. Save. Copy the **Client ID** and generate/copy the **Client Secret**.

No scopes are configured here — they're requested at runtime (`user:write:chat`).

## 3. Kick

1. Go to https://kick.com → Settings → **Developer** (Kick Dev / API access). Create an app.
2. Set the **Redirect URI(s)**:
   - `http://localhost:8080/auth/kick/callback`
   - `<YOUR_WORKER_URL>/auth/kick/callback` (once deployed)
3. Request scopes: `chat:write` and `user:read`.
4. Copy the **Client ID** and **Client Secret**.

(Kick developer access can require enabling/approval — start this early.)

## 4. Worker env (`worker/.env`)

```
APP_URL=http://localhost:3000            # your frontend origin
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
TWITCH_REDIRECT_URI=http://localhost:8080/auth/twitch/callback
KICK_CLIENT_ID=...
KICK_CLIENT_SECRET=...
KICK_REDIRECT_URI=http://localhost:8080/auth/kick/callback
```

`APP_URL` is where users get bounced back to after signing in.
The `*_REDIRECT_URI` values must **exactly** match what you registered on Twitch/Kick.

## 5. Frontend env (`.env.local`)

```
NEXT_PUBLIC_X_WS_URL=ws://localhost:8080      # chat websocket
NEXT_PUBLIC_WORKER_URL=http://localhost:8080  # worker HTTP (auth)
```

## 6. Deploying the worker (Railway)

Recommended now — a deployed worker gives a stable **https** URL, which you need anyway:
an https frontend (Vercel) can't talk to a `ws://`/`http://` worker (mixed content), and
Kick/Twitch are happiest redirecting to https.

1. Create a Railway project from the repo, root directory `worker/`.
2. Start command: `npm run start` (it runs `tsx src/index.ts`).
3. Add all the env vars from step 4 (use the Railway public URL in the redirect URIs and
   leave `APP_URL` as your deployed frontend, e.g. the Vercel URL).
4. Copy the Railway public URL, then:
   - add `<railway-url>/auth/twitch/callback` and `<railway-url>/auth/kick/callback`
     to the Twitch and Kick apps,
   - set the frontend `NEXT_PUBLIC_WORKER_URL=https://<railway-url>` and
     `NEXT_PUBLIC_X_WS_URL=wss://<railway-url>`.

## Notes

- Sessions are kept in worker memory, so a worker restart logs everyone out (fine for now).
- X has no public API to post into a live broadcast chat, so it isn't a sign-in option.
