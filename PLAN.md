# PLAN.md — Stick RTS

Cross-session context carrier. Keep current scope, recovery state, and dirty-worktree warnings here. `HISTORY.md` is completed work only.

## Status — 2026-08-09

**Local documentation checkpoint (not yet pushed):**

```text
main:        cb54e98  (docs: reconcile project plan and history)
origin/main: c76e849  (merge: add turrets and Watch telemetry)
```

Main includes the post-S10 shipped gameplay/UI work:

- completed HUD/build-bar redesign and camera/mobile control work;
- Watch AI speed control and Hard AI global enemy-composition awareness;
- one starting turret per team, two purchasable turret slots, and turret combat/production/supply/formation/rendering;
- Watch match clock, resource differential, opposing team summaries, and non-overlapping Watch controls.

### Work explicitly stopped

The unfinished UX batch is isolated and **must not be merged or pushed**:

```text
worktree: C:\Users\simcr\projects\stick-rts-local-ux-batch
branch:   agent/local-ux-regression-batch
HEAD:     1e704ba  fix: advance newly spawned archers to formation
```

That commit has a deterministic regression check, but has **not** received owner LAN review. The worktree also contains uncommitted/incomplete pause/exit and Update Log artifacts. Do not treat them as finished, do not merge them, and do not overwrite or delete them without a separate owner decision.

Other retained isolated worktrees:

```text
agent/rl-commander-strategy-experiment  — preserved, unmerged experiment
agent/turret-watch-telemetry-local      — merged source branch retained locally
agent/visual-proof                      — separate art-pipeline work
```

## Restart gate — before resuming Stick RTS

Hermes Telegram progress reporting is being corrected first. Before restarting project work:

1. Enable and restart gateway streaming/progress settings.
2. Send a short live Telegram verification that shows a real in-turn/tool-progress signal.
3. Confirm the owner sees that signal.
4. Re-open this plan and explicitly choose whether to resume, discard, or re-scope the stopped UX batch.

Do **not** restart the game batch merely because Hermes has restarted.

## If the owner elects to resume the UX batch

**Approved scope (not yet restarted):**

1. **Archer spawn formation:** retain and re-verify `1e704ba`. A defender archer that spawns behind its assigned mine-side slot must move into that slot even when no warrior escort exists; once positioned, normal unsupported-archer cohesion still applies.
2. **Pause / Resume / Exit:** add screen-space controls to Player-vs-AI and Watch AI. Pause must freeze simulation time, AI, production, combat, movement, and projectiles. Resume continues the same world. Exit returns to landing menu.
3. **Update Log:** add a landing-page button and a readable/back-navigable player-facing update-log screen. Entries are curated release notes, not raw Git history.

### Delivery contract

```text
deterministic regression / focused test
→ local implementation checkpoint in Telegram
→ browser check
→ LAN URL for owner review
→ owner approval
→ commit/merge/push
→ verify local main = origin/main
```

No model commander, strategy league/history, RL/training systems, model proxy, or art runtime integration belongs in this batch.

## Architecture invariants

- Vanilla JS ES modules + Canvas 2D; no build step. Local preview: `python -m http.server`.
- `src/sim/` has no browser/DOM references. `src/render/` reads simulation state and does not mutate it.
- Tunables belong in `src/config.js`; no new magic numbers in systems/rendering.
- UI is screen-space and must be camera-zoom independent.
- Simulation randomness remains confined to `src/sim/rng.js`; `Math.random` is banned in `src/`.

## Parked

- AI balance/re-tune after the shortened-map finding; do not mix it into the UX batch.
- Owner map-length playtest.
- Sunmeadow art remains in `agent/visual-proof`; no runtime integration without explicit owner approval.
- Repository cleanup follows `docs/retention-cleanup-manifest.md`; no automatic tracked-file deletion.
