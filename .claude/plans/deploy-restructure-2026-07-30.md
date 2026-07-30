---
status: DONE — all 7 phases complete 2026-07-30. Live: frontend https://duck-hunt-multiplayer-gamma.vercel.app, server wss://duck-hunt-multiplayer-server-production.up.railway.app. E2E WS protocol test passed (create-room/join-room/input relay). Only unverified item: real-device iOS gyroscope check (needs a physical phone).
created: 2026-07-30
scope: frontend client repo (this dir) + sibling server repo
---

# Deploy restructure — Duck Hunt Multiplayer

## Goal

Take both repos from "zip extract with no git history, dev-only cloudflared tunnel workaround" to a real deployed setup: frontend on Vercel, WS relay server on Railway, both git-tracked with CI.

## Repos involved

- **Frontend/client** (this repo): `c:\Users\Nova Peças\Downloads\duck-hunt-multiplayer-main\duck-hunt-multiplayer-main` — Vite static build, two entry points (`index.html` host, `controller.html` phone controller). Deploy target: **Vercel**.
- **WS server**: `c:\Users\Nova Peças\Downloads\duck-hunt-multiplayer-server-main\duck-hunt-multiplayer-server-main` — Node + `ws`, raw WebSocketServer on `$PORT`. Deploy target: **Railway**.

## In scope

- Git init + first commit for both repos (neither is currently a git repo).
- Removing dev-only debris (hardcoded cloudflared tunnel hostname, stale `.env.example` URL).
- Production env var wiring (`VITE_WS_URL` on Vercel ← Railway WSS URL).
- Server health-check fix (raw `ws` server returns 426 on plain HTTP GET, which will fail Railway's default HTTP health check).
- GitHub Actions CI for both repos (typecheck + build, server also runs its vitest suite).
- README updates in both repos replacing the cloudflared-tunnel dev instructions with real deploy docs.
- End-to-end smoke test after both are live.

## Out of scope

- Auth, persistence/DB, rate limiting, CORS origin locking (README already documents this is an in-memory MVP — not changing that model).
- Custom domain setup (using Vercel/Railway default subdomains unless you say otherwise).
- Mobile app packaging — this stays a browser-based controller.

## Replanning triggers

- If you don't already own the GitHub repos referenced in the READMEs (`Renan-ag/duck-hunt-multiplayer`, `duck-hunt-multiplayer-server`) or want new ones instead — changes Phase 1/4 (repo creation vs. reconnecting existing remotes).
- If Railway's free tier doesn't fit (usage-based after trial) — would need to swap Phase 5 target to Render/Fly.io.
- If `npm run build` or `npm test` fail during Phase 2/3 due to issues not visible from static reading — stop and report before continuing to deploy phases.

---

## Phase 1 — Git init both repos

**Files touched:** `.git/` (new) in both repo roots.

- Frontend repo: `git init`, `git add -A`, initial commit.
- Server repo: `git init`, `git add -A`, initial commit.
- Confirm with you whether to push to the existing GitHub repos named in the READMEs or create new ones, before any `git push`.

**Verify:** `git status` clean in both repos after commit; `git log -1` shows the initial commit.

---

## Phase 2 — Frontend: strip dev-only debris, wire prod env

**Files touched:**
- [vite.config.ts](vite.config.ts) — remove the hardcoded `server.allowedHosts: ["wisconsin-between-budgets-plumbing.trycloudflare.com"]` (stale tunnel hostname, irrelevant to a Vercel-built static site; `server.*` only affects `vite dev` anyway).
- [.env.example](.env.example) — replace the stale `wss://fast-rotary-lay-lance.trycloudflare.com/` with a generic placeholder, e.g. `wss://your-server.up.railway.app`.
- [readme.md](readme.md) — replace the cloudflared-tunnel-for-iOS section with: HTTPS is automatic on Vercel, so no tunnel workaround is needed in production; keep a short note that local dev still needs it for iOS gyroscope testing.

**Verify:** `npm run build` succeeds (`tsc && vite build`), `dist/index.html` and `dist/controller.html` both emitted.

---

## Phase 3 — Server: fix health-check response, confirm build

**Files touched:**
- [src/server.ts](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/src/server.ts) (sibling repo) — the `WebSocketServer` is constructed with only `{ port }`, so `ws` spins up its own internal `http.Server` whose default handler returns `426 Upgrade Required` for any plain GET. Railway's default health check expects a 2xx on `/`. Fix: construct an explicit `http.Server`, add a request listener that responds `200 OK` to GET `/` (or `/health`), and pass `{ server }` to `WebSocketServer` instead of `{ port }`.
- No other logic changes — room/rejoin/input relay logic stays as-is (out of scope).

**Verify:** `npm run build` (esbuild bundle succeeds), `npm test` (vitest suite passes), then `npm start` locally + `curl -i http://localhost:8080/` returns `200`, and a manual WS client can still connect and get `room-created`.

---

## Phase 4 — CI for both repos

**Files touched:**
- Frontend: `.github/workflows/ci.yml` — on push/PR: `npm ci`, `npx tsc --noEmit`, `npm run build`.
- Server: `.github/workflows/ci.yml` — on push/PR: `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run build`.

**Verify:** Workflow YAML is valid (`actionlint` if available, otherwise visual check); real green run happens once pushed to GitHub in Phase 6/7 — note that as a follow-up check, don't claim CI is green before it's actually run.

---

## Phase 5 — Deploy server to Railway

- Connect Railway to the server repo (GitHub-linked or `railway up` via CLI — ask which you prefer at this step).
- Railway auto-detects Node via Nixpacks, runs `npm run build` then `npm start`; `PORT` is injected automatically (server already reads `process.env.PORT`, no change needed).
- Disable or confirm the health check now passes against `/` (Phase 3 fix) before considering this done.
- Capture the resulting `wss://<...>.up.railway.app` URL.

**Verify:** `wscat -c wss://<railway-domain>` (or equivalent) connects and responds to `{"type":"create-room"}` with `{"type":"room-created", ...}`.

---

## Phase 6 — Deploy frontend to Vercel

- Connect Vercel to the frontend repo (Vercel auto-detects Vite; multi-entry build via `vite.config.ts`'s `rollupOptions.input` already outputs both `index.html` and `controller.html` into `dist/` — no extra `vercel.json` rewrites needed since both are real static files, not client-side routes).
- Set env var `VITE_WS_URL` = the Railway WSS URL from Phase 5, in Vercel project settings.
- Deploy.

**Verify:** Visit the Vercel URL — host screen loads, QR code renders (uses `location.origin`, so it'll correctly point at the Vercel domain per [src/main.ts:21](src/main.ts#L21)).

---

## Phase 7 — End-to-end smoke test + doc cleanup

- From a phone: scan the QR / open `<vercel-url>/controller.html?room=...`, grant gyroscope permission (HTTPS now satisfied by Vercel, so no tunnel needed), confirm cursor moves on host and shoot input registers.
- Update both READMEs' "how to run" sections to describe the real deploy (Vercel + Railway URLs) instead of the cloudflared local-tunnel flow, keeping a short "local dev" subsection for anyone building locally.

**Verify:** Full round-trip — host creates room → controller joins → gyroscope input moves cursor → shot registers in-game — works against the deployed URLs, not localhost.
