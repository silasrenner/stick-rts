# PLAN.md — Stick RTS

Cross-session context carrier. Keep only current scope, recovery state, and dirty-worktree warnings here. Completed work belongs in `HISTORY.md`; detailed historical narratives live in `docs/archive/session-history-legacy.md` and are search-only.

## Current status — 2026-08-10

- `main` is clean with a local documentation checkpoint one commit ahead of `origin/main`; it has not been pushed.
- The latest synchronized product release is `bae1545` (`feat: cap production queue and schedule hard turrets`).
- No implementation batch is currently active in this worktree.
- The previously local Hard queue/income/turret batch is represented by `bae1545`; do not describe it as uncommitted, pending local-only work.
- The next implementation scope requires owner approval and a local-review gate before any new integration or push.

### Most recent completed release — queue, income, and Hard turrets

`bae1545` delivered the focused Hard queue/income/turret batch:

- Dedicated active-player Turret glyph.
- Shared FIFO production queue capped at five paid future items across units, heroes, structures, and turrets; rejected player purchases report `Queue full` / `Production queue is full`, while scripted AIs reconsider later.
- `GOLD_PER_TRIP` reduced from 25 to 23; mine travel, slots, cycle time, costs, and Forgemaster multiplier remain unchanged.
- Scripted Hard buys its two buildable defensive turrets through the ordinary economy path at the configured 5.5- and 13-minute thresholds, without changing turret cost, slots, combat stats, or placement.

Focused checks added or exercised by the release: `node tools/turret-glyph-check.mjs`, `node tools/production-queue-cap-check.mjs`, `node tools/turret-sim-check.mjs`, `node tools/hard-vision-check.mjs`, `node tools/defend-anchor-check.mjs`, and `node tools/balance-check.mjs`.

### Retained isolated worktrees

```text
agent/local-ux-regression-batch        — prior UX review branch; dirty (`src/main.js` modified, `src/update-log-data.js` and `src/updateLog.js` untracked); do not mix into main
agent/rl-commander-strategy-experiment — preserved, unmerged experiment
agent/turret-watch-telemetry-local     — merged source branch retained locally
agent/visual-proof                     — separate art-pipeline work
```

## Architecture invariants

- Vanilla JS ES modules + Canvas 2D; no build step. Local preview: `python -m http.server`.
- `src/sim/` has no browser/DOM references. `src/render/` reads simulation state and does not mutate it.
- Tunables belong in `src/config.js`; no new magic numbers in systems/rendering.
- UI is screen-space and must be camera-zoom independent.
- Simulation randomness remains confined to `src/sim/rng.js`; `Math.random` is banned in `src/`.

## Parked

- Broader scripted Hard strategic posture / retreat / siege tuning, only after the queue-income-turret baseline is measured and locally reviewed.
- Owner map-length playtest.
- Model commander, strategy league/history, RL/training systems, and model proxy remain excluded from `main` pending separately approved scope.
- Sunmeadow art remains in `agent/visual-proof`; no runtime integration without explicit owner approval.
- Repository cleanup follows `docs/retention-cleanup-manifest.md`; no automatic tracked-file deletion.
