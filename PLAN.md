# PLAN.md — Stick RTS

Cross-session context carrier. Keep current scope, recovery state, and dirty-worktree warnings here. `HISTORY.md` is completed work only.

## Status — 2026-08-10

### Completed approved UX release

The owner reviewed the local view and approved promotion of the focused UX batch.
`main` now contains these completed commits in addition to the post-S10 gameplay/UI
release:

```text
5510579  fix: advance newly spawned archers to formation
4060cc9  feat: add local pause and update log review
18fb768  docs: record hard AI headless analysis
```

- **Archer spawn formation:** a newly spawned unescorted defender archer moves
  from home toward its assigned mine-side formation slot; the normal
  already-positioned cohesion behavior remains intact. Regression check:
  `node tools/archer-spawn-formation-check.mjs`.
- **Pause / Resume:** Player-vs-AI and Watch AI have screen-space pause controls,
  a pause overlay, and `P` shortcut. Pausing freezes tick count, gold, elapsed
  match time, AI, production, combat, movement, and projectiles; resuming
  continues the same world.
- **Update Log:** the landing menu exposes a curated, back-navigable player-facing
  Update Log in `src/updateLog.js`.
- **Focused browser check:** `node tools/pause-ux-check.mjs` verifies pause and
  resume behavior, Watch AI control placement, and Update Log navigation against
  a fresh local server/Chrome CDP session.

No model commander, strategy league/history, RL/training systems, model proxy, or
art runtime integration was included in this release.

Other retained isolated worktrees remain intentionally separate:

```text
agent/rl-commander-strategy-experiment  — preserved, unmerged experiment
agent/turret-watch-telemetry-local      — merged source branch retained locally
agent/visual-proof                      — separate art-pipeline work
```

## Architecture invariants

- Vanilla JS ES modules + Canvas 2D; no build step. Local preview: `python -m http.server`.
- `src/sim/` has no browser/DOM references. `src/render/` reads simulation state and does not mutate it.
- Tunables belong in `src/config.js`; no new magic numbers in systems/rendering.
- UI is screen-space and must be camera-zoom independent.
- Simulation randomness remains confined to `src/sim/rng.js`; `Math.random` is banned in `src/`.

## Active local-review batch — Hard queue, income, and turret tuning

**Branch:** `agent/local-hard-queue-tuning` from clean `main` / `f39ed17`.

### Owner-approved scope

1. Fix the active-player build-menu Turret glyph so it is a turret rather than a stick person.
2. Cap the shared FIFO production queue at **five queued items** for both teams. This applies to units, heroes, structures, and turrets: it limits paid future work, not living population. Rejected player purchases must show an accurate queue-full reason; scripted AIs wait and reconsider on their next decision.
3. Reduce baseline `GOLD_PER_TRIP` from 25 to **23** (an 8% reduction), leaving mine travel, slots, cycle time, costs, and the Forgemaster multiplier unchanged.
4. Make scripted Hard buy its two buildable defensive turrets through the normal economy path at the existing configured timing thresholds, without changing turret cost, slots, combat stats, or placement.

### Exclusions

- No map-length change, unit/hero/turret combat-stat rebalance, build-cycle redesign, counter-pick/hero policy tuning, model/RL work, or remote push.
- The owner’s later strategic-AI idea is intentionally deferred until this measured local batch is reviewed.

### Evidence gates before owner review

- **Implemented locally, uncommitted:** dedicated Turret glyph; five-item all-kind FIFO queue cap with `queueFull` failure; `GOLD_PER_TRIP` 25 → 23; Hard's configured 5.5- and 13-minute turret schedule through `buyTurret`; player-facing `Queue full` / `Production queue is full` copy.
- **Automated evidence completed:** `node tools/turret-glyph-check.mjs`, `node tools/production-queue-cap-check.mjs`, `node tools/turret-sim-check.mjs`, `node tools/hard-vision-check.mjs`, `node tools/defend-anchor-check.mjs`, and `node tools/balance-check.mjs` passed on this branch.
- **LAN evidence completed:** the exact worktree is served at `http://192.168.0.83:8812`; an HTTP check confirmed both the project index and `GOLD_PER_TRIP: 23`. Older competing port-8811 game servers were terminated.
- **Still required:** owner browser review of the visible Turret glyph and queue-full feedback, plus a Watch Hard-vs-Hard observation confirming scheduled turret construction in live play.
- No push; owner reviews LAN result before any integration discussion.

## Parked

- Broader scripted Hard strategic posture / retreat / siege tuning after this isolated queue-income-turret baseline is measured and locally reviewed.
- Owner map-length playtest.
- Sunmeadow art remains in `agent/visual-proof`; no runtime integration without explicit owner approval.
- Repository cleanup follows `docs/retention-cleanup-manifest.md`; no automatic tracked-file deletion.
