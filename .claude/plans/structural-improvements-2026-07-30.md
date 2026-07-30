---
status: DONE — all 5 phases complete 2026-07-30. Player cap fixed to 4 (server + frontend consistent); MAX_PLAYERS centralized; prod debug overlay off; dead debug code removed; PlayerInput type unified. Build/typecheck/tests green in both repos.
created: 2026-07-30
scope: frontend client repo (this dir) + sibling server repo — code structure / correctness review
---

# Structural improvements — Duck Hunt Multiplayer

## Goal

Fix a real gameplay-breaking bug (player-count mismatch between server and frontend) and clean up the structural debt found while reviewing both repos: magic numbers duplicated across files, a production debug flag left on, dead/commented debug code, and a type that silently drifted from what's actually sent over the wire.

## Repos involved

- **Frontend**: `c:\Users\Nova Peças\Downloads\duck-hunt-multiplayer-main\duck-hunt-multiplayer-main`
- **Server**: `c:\Users\Nova Peças\Downloads\duck-hunt-multiplayer-server-main\duck-hunt-multiplayer-server-main`

## Findings (ranked by impact)

1. **[Bug] Player-count mismatch, server vs. frontend.** [roomManager.ts:13-14](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/src/roomManager.ts#L13-L14) allows 5 players (`maxPlayers: 5`, `availablePlayerIds: [1,2,3,4,5]`). But the host game hardcodes 4 everywhere: [constants.ts:14-19](src/constants.ts#L14-L19) `PLAYER_COLORS` only has keys 1-4, [gameManager.ts:18-21](src/gameManager.ts#L18-L21) score/bullet arrays are length-4, and [scenes/game.ts:14-39](src/scenes/game.ts#L14-L39) hardcodes 4 score text objects and a 4-slot bullet-UI layout. A 5th player joining gets `PLAYER_COLORS[5] === undefined`, which breaks `k.Color.fromHex(undefined)` in [main.ts:31](src/main.ts#L31) and leaves that player's score silently untracked. Interestingly, [controller.ts:16-25](src/controller.ts#L16-L25) already has a 5th player theme defined — so this looks like a half-finished attempt to support 5 players. The NES-style bullet/score UI in `game.ts` is laid out for exactly 4 corners, so extending to 5 would need new art/layout, not just array resizing.
   - **Recommended fix (default, will do unless you say otherwise): cap the server back to 4 players**, matching what the UI actually supports, and drop the stray 5th controller theme. This is the smaller, safer change. Extending to a real 5-player mode is a separate feature, not a bug fix — flag it if you want that instead.
2. **Magic player-count (`4`) duplicated ~8 places** with no single source of truth ([constants.ts](src/constants.ts), [gameManager.ts](src/gameManager.ts), [scenes/game.ts](src/scenes/game.ts) x2 loops). Any future change to player count has to be hunted down file by file — that's exactly how finding #1 happened.
3. **Kaplay debug overlay on in production.** [kaplayCtx.ts:11](src/lib/kaplayCtx.ts#L11) has `debug: true` hardcoded — every player sees the hitbox/FPS debug overlay on the live Vercel deploy right now.
4. **Leftover debug artifacts**: stray `console.log(gameManager.numberBulletsLeft)` at [scenes/game.ts:151](src/scenes/game.ts#L151); commented-out debug shortcut at [scenes/main-menu.ts:61-64](src/scenes/main-menu.ts#L61-L64).
5. **Protocol type already drifted from runtime behavior.** [types/ws.ts](src/types/ws.ts) declares `PlayerInput` without `recalibrate`, but [helpers/utils.ts:8-17](src/helpers/utils.ts#L8-L17) independently redeclares the same shape inline *with* `recalibrate` — because it never imports `PlayerInput` in the first place. Two definitions of the same wire message, already out of sync. Same root cause class as #1: no single source of truth, so shapes silently diverge.
6. **Server trusts message shape with no validation** (`data: any` in [server.ts:24](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/src/server.ts#L24)). Low risk today (only relayed to the host, README already documents "no auth, in-memory MVP"), but noting it since it's a structural gap, not proposing a fix — see Out of scope.
7. **No lint/format config in either repo** (no `.eslintrc`/`.prettierrc`). Noting it, not fixing it here — see Out of scope.

## In scope

- Fix #1 (player-count mismatch) — the only actual bug.
- Fix #2 (centralize the player-count magic number) — directly prevents #1 from recurring.
- Fix #3 (debug flag) — one-line, real production impact.
- Fix #4 (dead debug code cleanup) — trivial, improves readability.
- Fix #5 (unify the `PlayerInput` type) — small, closes the type-drift gap.

## Out of scope (flag if you want these added)

- Extending the game to actually support 5 players (new UI layout/art, not a bug fix).
- Server-side message validation/schema (zod or similar) — would be new defensive code, not a structural cleanup of what's there.
- Adding ESLint/Prettier to either repo — real value, but a separate effort (choosing config, fixing whatever it flags) from this bug-fix-focused pass.
- Shared types package between client/server repos — would prevent future drift like #5 permanently, but means new tooling/publishing setup across two repos; worth a follow-up decision, not bundled here.

## Replanning triggers

- If you'd rather extend the UI to really support 5 players than cap the server at 4, Phase 1 changes direction (frontend UI/asset work instead of a server one-line cap).
- If build or tests fail in a way not explained by these changes, stop and report before continuing.

---

## Phase 1 — Fix player-count mismatch

**Files touched:**
- [`duck-hunt-multiplayer-server-main/src/roomManager.ts`](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/src/roomManager.ts) — `maxPlayers: 5` → `4`, `availablePlayerIds: [1,2,3,4,5]` → `[1,2,3,4]`.
- [`duck-hunt-multiplayer-server-main/tests/server.spec.ts`](../../../../../../duck-hunt-multiplayer-server-main/duck-hunt-multiplayer-server-main/tests/server.spec.ts) — the "should not allow more than max players" test loops 5 successful joins then expects a 6th to fail (line ~45); "should allow 4 players" actually loops 4 then adds a 5th and expects success (line ~58, contradicts its own name). Update both to match the new 4-player cap: 4 successful joins, 5th rejected.
- [`src/controller.ts`](src/controller.ts) — remove the 5th entry (`5: {...}`) from `PLAYER_THEMES` (lines 16-25).

**Verify:** `npm test` in the server repo passes with the corrected expectations; manually confirm a 5th `join-room` now returns `{type:"error"}`.

---

## Phase 2 — Centralize player-count constant

**Files touched:**
- [`src/constants.ts`](src/constants.ts) — add `export const MAX_PLAYERS = 4;`.
- [`src/gameManager.ts`](src/gameManager.ts) — replace the literal 4-length arrays (`currentScore`, `numberBulletsLeft`) with `Array(MAX_PLAYERS).fill(0)` / `Array(MAX_PLAYERS).fill(3)` in both the initial state and `resetGameState`.
- [`src/scenes/game.ts`](src/scenes/game.ts) — replace the `for (let i = 0; i < 4; i++)` bullet-mask loop (line 74) with `MAX_PLAYERS`. Leave the 4 individual `k.add([...])` score text blocks as-is (they're position-specific NES-UI layout, not a loop — collapsing them isn't worth the risk of a visual regression in this pass).

**Verify:** `npx tsc --noEmit` clean; `npm run build` succeeds; `grep -rn "PLAYER_COLORS\[" src/` still resolves only within 1-4.

---

## Phase 3 — Turn off production debug overlay

**Files touched:**
- [`src/lib/kaplayCtx.ts`](src/lib/kaplayCtx.ts) — `debug: true` → `debug: import.meta.env.DEV`.

**Verify:** `npm run build`, then confirm the built `dist/assets/main-*.js` doesn't have the debug overlay forced on (Vite inlines `import.meta.env.DEV` as `false` for production builds — spot-check the bundle or just trust Vite's static replacement); `npm run dev` still shows the overlay locally.

---

## Phase 4 — Remove dead debug code

**Files touched:**
- [`src/scenes/game.ts`](src/scenes/game.ts) — delete the `console.log(gameManager.numberBulletsLeft)` at line 151.
- [`src/scenes/main-menu.ts`](src/scenes/main-menu.ts) — delete the commented-out debug shortcut at lines 61-64.

**Verify:** `grep -rn "console.log" src/` returns nothing outside legitimate error-handling logs (e.g. `network-manager.ts`'s `console.error` on WS errors, which stays).

---

## Phase 5 — Unify the `PlayerInput` wire type

**Files touched:**
- [`src/types/ws.ts`](src/types/ws.ts) — add `recalibrate?: boolean` to `PlayerInput`.
- [`src/helpers/utils.ts`](src/helpers/utils.ts) — `handlePlayerInput`'s `payload` param: replace the inline duplicate type with `import type { PlayerInput } from "../types/ws"` and use it directly, so there's one definition instead of two that can drift again.

**Verify:** `npx tsc --noEmit` clean in both the edited files' context; `grep -rn "gamma?: number" src/` shows the shape defined in exactly one place (`types/ws.ts`).

---

## Final check (all phases)

`npm run build` (frontend) and `npm test && npm run build` (server) both green; commit with a message describing the bug fix separately from the cleanup if you want a clean git history (two commits: "fix: cap room to 4 players" + "chore: cleanup debug flag/dead code/type drift"), or one combined commit — your call at commit time.
