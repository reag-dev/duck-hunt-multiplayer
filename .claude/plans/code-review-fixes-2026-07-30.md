---
status: DONE — all 6 phases complete 2026-07-30. Build/typecheck/tests green in both repos (7/7 server tests incl. new payload-validation case). Deployed to production and verified.
created: 2026-07-30
scope: frontend client repo (this dir) + sibling server repo — fixes for the 6 code-review findings from today's review
---

# Code review fixes — Duck Hunt Multiplayer

## Goal

Fix all 6 findings from today's code review: a blank-page crash on missing env config, orphaned controllers on host disconnect, a pause feature that doesn't pause, a host WS client with no failure feedback, an unvalidated input relay, and one dead field.

## Repos involved

- **Frontend**: `c:\Users\Nova Peças\Downloads\duck-hunt-multiplayer-main\duck-hunt-multiplayer-main`
- **Server**: `c:\Users\Nova Peças\Downloads\duck-hunt-multiplayer-server-main\duck-hunt-multiplayer-server-main`

## In scope

All 6 review findings, listed as phases below.

## Out of scope

- Full reconnect (re-joining a live room after a drop) — moot for the host, since the server already destroys the room the instant the host disconnects (Phase 2 fixes the notification, not room persistence). Real reconnect would need the server to keep rooms alive across a host blip, which is a bigger design change than this pass.
- Merging `NetworkManager`/`SocketClient` into one shared class — Phase 4 gives the host the same user-facing failure feedback the controller already has, without doing that larger refactor.
- Full schema validation library (zod etc.) on the server — Phase 5 adds a small inline guard, not a new dependency.

## Replanning triggers

- If adding the `room-closed` message type surfaces other places that assume a room always exists once joined, stop and report before continuing.

---

## Phase 1 — Fail visibly on missing `VITE_WS_URL`

**Files touched:**
- [src/main.ts](src/main.ts) — before constructing `NetworkManager`, check `if (!WS_URL)`, render a visible on-page error (reusing the `#app`/`document.body` pattern already used for the "Sala inválida" case in controller.ts), and return early instead of letting `new WebSocket(undefined)` throw uncaught.

**Verify:** `VITE_WS_URL= npm run build && npm run preview`, load the page — see a readable error instead of a blank page; normal `npm run dev` with `.env` set still works.

---

## Phase 2 — Notify controllers when the host disconnects

**Files touched:**
- [`duck-hunt-multiplayer-server-main/src/server.ts`](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/src/server.ts) — in the `ws.on("close")` host branch (~line 147), before `roomManager.removeRoom`, iterate `room.controllers.values()`, look up each by `clientId` in `clients`, and send `{type:"room-closed"}` to any still connected.
- [src/types/ws.ts](src/types/ws.ts) — add `{ type: "room-closed" }` to the `ServerMessage` union.
- [src/controller.ts](src/controller.ts) — handle `room-closed`: clear `localStorage` (`rejoinToken`/`roomId`), hide shoot/recalibrate buttons, show a clear "Sala encerrada pelo host" status.

**Verify:** manual — connect a controller, close the host tab, confirm the controller shows the closed-room message instead of staying on "Controle pronto" forever.

---

## Phase 3 — Make pause actually gate gameplay

**Files touched:**
- [src/scenes/game.ts](src/scenes/game.ts) — in the `network.onMessage` handler (~line 208), add an early return when `gameManager.isGamePaused` is true, before calling `handlePlayerInput`. This freezes both cursor movement and shooting while paused, matching what "pause" should mean.

**Verify:** in a dev session, press 'p' mid-hunt, confirm bullets/score don't change while paused, resume with 'p' and confirm input flows again.

---

## Phase 4 — Surface host WS failures instead of failing silently

**Files touched:**
- [src/socket/network-manager.ts](src/socket/network-manager.ts) — add an `onclose` handler alongside the existing `onopen`/`onmessage`/`onerror`; accept an optional status callback (mirroring `SocketClient`'s constructor shape) so `main.ts` can react.
- [src/main.ts](src/main.ts) — pass a callback that calls `showToast(...)` (already imported/used for player events) on error/close, so the host sees "Conexão com o servidor perdida" instead of nothing.

**Verify:** manually kill the server locally while the host page is open, confirm a toast appears instead of silent failure.

---

## Phase 5 — Validate `input` payload shape before relay

**Files touched:**
- [`duck-hunt-multiplayer-server-main/src/server.ts`](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/src/server.ts) — in the `input` branch (~line 124), add an inline check that `data.payload` is a plain object and that `gamma`/`beta` (if present) are `typeof === "number"` and finite, `shoot`/`recalibrate` (if present) are `typeof === "boolean"`; drop the message (return) if not.

**Verify:** extend `tests/server.spec.ts` with a case sending `{type:"input", payload:{gamma:"x"}}` and assert the host receives nothing for it; `npm test` green.

---

## Phase 6 — Remove dead `Player.score` field

**Files touched:**
- [src/types/player.ts](src/types/player.ts) — remove `score: number`.
- [src/main.ts](src/main.ts) — remove `score: 0` from the player object built in the `player-joined` handler.

**Verify:** `npx tsc --noEmit` clean; `grep -rn "\.score" src/` returns nothing (scoring stays entirely in `gameManager.currentScore`).

---

## Final check (all phases)

`npm run build` + `npx tsc --noEmit` (frontend) and `npm test && npm run build` (server) all green; manual smoke test of the pause fix and the host-disconnect notification (both are behavior changes a type-checker won't catch).
