# S6 — Balance + Polish

Full plan/context: see session plan (statue-warning gap, FPS/stress
scaffold, headless docs correction, UI legibility — scoped via user Q&A on
2026-07-18). Deferred out of this pass: `WORLD_WIDTH`/pacing tuning (until
user has played) and the Hard-vs-Medium AI-vs-AI stalemate (flagged note
only).

## 1. Statue-under-attack warning — DONE
- [x] `combat.js`: set/retrigger a per-team `statueWarningTimer` on
      damaging hits to that team's statue
- [x] `ui.js`: render a distinct warning (not the `uiMessage` purchase-
      feedback slot) only for the player's team while the timer is active
- [x] Verify: signal fires only once structures are cleared and statue is
      actually hit; clears after timeout

## 2. FPS overlay + stress-test hotkey — DONE
- [x] `main.js`: rolling frame-time average from the existing rAF loop,
      toggleable
- [x] `main.js`: small FPS readout, corner, only when toggled on
- [x] Debug hotkey (`F` toggle, `S` spawn) + `window.__spawnStressTest`/
      `__toggleFpsOverlay`/`__fps` hooks; homeX+enemyHomeX pinned per unit
      so the AI behavior tree can't march stress units into each other
- [x] Verify via `claude-in-chrome`: 40 units held steady 4+s at ~60fps,
      zero console errors, headless invariant check still passes

## 3. Headless docs correction — DONE
- [x] `PLAN.md` §2.5: reword to match actual `tools/headless.js --batch`
      output (winner, match length/trial, win/loss/undecided counts,
      average length) — drop gold-curve/composition-curve claims

## 4. UI legibility fixes — DONE
- [x] `ui.js`: semi-transparent background panel behind HUD text block
- [x] `ui.js`: persistent disabled-reason label under each build-menu
      button, mirroring economy.js's exact reason precedence;
      `PURCHASE_REASON_TEXT` moved to ui.js as the single source of truth
      and imported back into main.js (was previously duplicated)
- [x] Verify via `claude-in-chrome`: all 5 disabled states screenshotted
      (gold, cap, maxStructures, heroAlive, heroCooldown) — correct text,
      fits button bounds, updates dynamically; zero console errors;
      headless invariant check still passes

## 5. Baseline headless batch runs — DONE
- [x] Ran `--batch` for all 6 unordered difficulty pairings, 5 trials
      each (fully deterministic sim — no RNG — so more trials per
      pairing add no information; config.js untouched)
- [x] Results: E/E and M/M mirror matches stalemate (5/5 undecided @
      1000s cap, consistent with known cautious-mirror pattern); E vs M
      (851.9s) and E vs H (553.7s) exactly match PLAN.md's existing S5
      figures; M vs H stalemates 5/5, consistent with the already-
      documented known limitation. NEW finding: H vs H does NOT
      stalemate — the 'ai'-position side wins 5/5 in exactly 545.1s,
      every trial identical (deterministic). Root cause not investigated
      (would require combat-resolution debugging, out of this task's
      data-gather scope) — flagged in PLAN.md Status for a future
      session, not fixed now.

## 6. Full acceptance-criteria walkthrough — DONE
- [x] Re-confirmed already-evidenced criteria (cap math, statue gating,
      gold-never-negative, hero respawn/cost/switchability, purchase
      feedback, config centralization)
- [x] Live-drove the rest via `claude-in-chrome`: win/lose + rematch +
      real-click difficulty change, all 3 units + all 3 heroes purchased
      and screenshotted, hero control/move/attack/special/death/cooldown/
      re-purchase, deterministic camera edge-scroll (dispatched events,
      not the possibly-throttled real rAF loop), soft-lock scenario
      (zero gold + zero units vs active Hard AI, ~700s fast-forward,
      resolved cleanly to `lost`, zero console errors)
- [x] Found + fixed a real bug along the way: statue-warning banner stuck
      on screen through the win/lose overlay (timer frozen once
      `matchState !== 'playing'`) — gated the render, re-verified fixed
- [x] Marked all 10 `stick-rts-brief.md` Acceptance Criteria `[x]`
- [x] Updated `PLAN.md` Status section with full S6 close-out

## Final
- [x] `node tools/headless.js` (default mode) passes after all changes
- [ ] Commit — only on explicit user request
